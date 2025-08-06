import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import Quiz, GameSession, Player, PlayerAnswer, QuestionStats
import logging

logger = logging.getLogger(__name__)

class GameConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for players"""
    
    async def connect(self):
        self.game_code = self.scope['url_route']['kwargs']['game_code']
        self.room_group_name = f'game_{self.game_code}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"Player connected to game {self.game_code}")
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        logger.info(f"Player disconnected from game {self.game_code}")
    
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'player_joined':
                await self.handle_player_joined(data)
            elif message_type == 'heartbeat':
                await self.send(text_data=json.dumps({'type': 'heartbeat_ack'}))
            elif message_type == 'request_leaderboard':
                await self.send_leaderboard_update()
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
        except Exception as e:
            logger.error(f"Error in receive: {e}")
    
    async def handle_player_joined(self, data):
        """Handle player joining notification"""
        player_data = data.get('player', {})
        
        # Broadcast to all players in the room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'player_joined_broadcast',
                'player': player_data
            }
        )
    
    async def send_leaderboard_update(self):
        """Send current leaderboard to this player"""
        leaderboard_data = await self.get_leaderboard()
        await self.send(text_data=json.dumps({
            'type': 'leaderboard_update',
            'data': leaderboard_data
        }))
    
    # Message type handlers
    async def game_started(self, event):
        """Send game started message"""
        await self.send(text_data=json.dumps({
            'type': 'game_started',
            'question': event['question'],
            'question_number': event['question_number'],
            'total_questions': event['total_questions'],
            'time_limit': event['time_limit']
        }))
    
    async def new_question(self, event):
        """Send new question"""
        await self.send(text_data=json.dumps({
            'type': 'new_question',
            'question': event['question'],
            'question_number': event['question_number'],
            'total_questions': event['total_questions'],
            'time_limit': event['time_limit']
        }))
    
    async def game_ended(self, event):
        """Send game ended message"""
        await self.send(text_data=json.dumps({
            'type': 'game_ended',
            'final_leaderboard': event['leaderboard']
        }))
    
    async def leaderboard_update(self, event):
        """Send leaderboard update"""
        await self.send(text_data=json.dumps({
            'type': 'leaderboard_update',
            'data': event['data']
        }))
    
    async def player_joined_broadcast(self, event):
        """Broadcast player joined"""
        await self.send(text_data=json.dumps({
            'type': 'player_joined',
            'player': event['player']
        }))
    
    async def answer_submitted(self, event):
        """Notify about answer submission"""
        await self.send(text_data=json.dumps({
            'type': 'answer_submitted',
            'player': event['player'],
            'is_correct': event['is_correct']
        }))
    
    async def question_stats_update(self, event):
        """Send question statistics update"""
        await self.send(text_data=json.dumps({
            'type': 'question_stats',
            'stats': event['stats']
        }))
    
    @database_sync_to_async
    def get_leaderboard(self):
        """Get current leaderboard data"""
        try:
            quiz = Quiz.objects.get(game_code=self.game_code)
            session = GameSession.objects.filter(quiz=quiz).first()
            
            if not session:
                return {'leaderboard': [], 'total_players': 0}
            
            players = session.players.filter(is_connected=True).order_by('-score', 'nickname')[:20]
            
            leaderboard_data = []
            for i, player in enumerate(players):
                leaderboard_data.append({
                    'rank': i + 1,
                    'nickname': player.nickname,
                    'score': player.score,
                    'accuracy': player.accuracy,
                    'current_streak': player.current_streak,
                    'is_connected': player.is_connected,
                })
            
            return {
                'leaderboard': leaderboard_data,
                'total_players': session.players.filter(is_connected=True).count(),
                'session_status': session.status,
            }
            
        except Exception as e:
            logger.error(f"Error getting leaderboard: {e}")
            return {'leaderboard': [], 'total_players': 0}

class HostConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for game hosts"""
    
    async def connect(self):
        self.game_code = self.scope['url_route']['kwargs']['game_code']
        self.room_group_name = f'host_{self.game_code}'
        self.game_room_name = f'game_{self.game_code}'
        
        # Join host room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"Host connected to game {self.game_code}")
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        logger.info(f"Host disconnected from game {self.game_code}")
    
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'start_game':
                await self.start_game()
            elif message_type == 'next_question':
                await self.next_question()
            elif message_type == 'end_game':
                await self.end_game()
            elif message_type == 'pause_game':
                await self.pause_game()
            elif message_type == 'resume_game':
                await self.resume_game()
            elif message_type == 'request_stats':
                await self.send_game_stats()
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received from host")
        except Exception as e:
            logger.error(f"Error in host receive: {e}")
    
    async def start_game(self):
        """Start the game"""
        success = await self.update_game_status('ACTIVE')
        if success:
            question_data = await self.get_current_question()
            if question_data:
                # Notify all players
                await self.channel_layer.group_send(
                    self.game_room_name,
                    {
                        'type': 'game_started',
                        'question': question_data['question'],
                        'question_number': question_data['question_number'],
                        'total_questions': question_data['total_questions'],
                        'time_limit': question_data['time_limit']
                    }
                )
                
                # Notify host
                await self.send(text_data=json.dumps({
                    'type': 'game_started',
                    'success': True,
                    'question': question_data
                }))
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'No questions available'
                }))
        else:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to start game'
            }))
    
    async def next_question(self):
        """Move to next question"""
        result = await self.advance_question()
        
        if result['success']:
            if result['game_ended']:
                # Game finished
                leaderboard = await self.get_final_leaderboard()
                await self.channel_layer.group_send(
                    self.game_room_name,
                    {
                        'type': 'game_ended',
                        'leaderboard': leaderboard
                    }
                )
                
                await self.send(text_data=json.dumps({
                    'type': 'game_ended',
                    'leaderboard': leaderboard
                }))
            else:
                # Next question
                question_data = await self.get_current_question()
                await self.channel_layer.group_send(
                    self.game_room_name,
                    {
                        'type': 'new_question',
                        'question': question_data['question'],
                        'question_number': question_data['question_number'],
                        'total_questions': question_data['total_questions'],
                        'time_limit': question_data['time_limit']
                    }
                )
                
                await self.send(text_data=json.dumps({
                    'type': 'new_question',
                    'question': question_data
                }))
        else:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to advance question'
            }))
    
    async def end_game(self):
        """End the game"""
        success = await self.update_game_status('FINISHED')
        if success:
            leaderboard = await self.get_final_leaderboard()
            
            # Notify all players
            await self.channel_layer.group_send(
                self.game_room_name,
                {
                    'type': 'game_ended',
                    'leaderboard': leaderboard
                }
            )
            
            # Notify host
            await self.send(text_data=json.dumps({
                'type': 'game_ended',
                'leaderboard': leaderboard
            }))
    
    async def pause_game(self):
        """Pause the game"""
        success = await self.update_game_status('PAUSED')
        await self.send(text_data=json.dumps({
            'type': 'game_paused',
            'success': success
        }))
    
    async def resume_game(self):
        """Resume the game"""
        success = await self.update_game_status('ACTIVE')
        await self.send(text_data=json.dumps({
            'type': 'game_resumed',
            'success': success
        }))
    
    async def send_game_stats(self):
        """Send current game statistics"""
        stats = await self.get_game_statistics()
        await self.send(text_data=json.dumps({
            'type': 'game_stats',
            'stats': stats
        }))
    
    # Database operations
    @database_sync_to_async
    def update_game_status(self, status):
        """Update game session status"""
        try:
            quiz = Quiz.objects.get(game_code=self.game_code)
            session = GameSession.objects.get(quiz=quiz)
            session.status = status
            
            if status == 'ACTIVE' and not session.started_at:
                session.started_at = timezone.now()
                session.question_start_time = timezone.now()
            elif status == 'FINISHED':
                session.ended_at = timezone.now()
            
            session.save()
            return True
        except Exception as e:
            logger.error(f"Error updating game status: {e}")
            return False
    
    @database_sync_to_async
    def get_current_question(self):
        """Get current question data"""
        try:
            quiz = Quiz.objects.get(game_code=self.game_code)
            session = GameSession.objects.get(quiz=quiz)
            
            if session.current_question_index < len(quiz.quiz_data['questions']):
                question = quiz.quiz_data['questions'][session.current_question_index]
                return {
                    'question': {
                        'text': question['question'],
                        'options': question['options'],
                        'type': question.get('type', 'multiple_choice')
                    },
                    'question_number': session.current_question_index + 1,
                    'total_questions': len(quiz.quiz_data['questions']),
                    'time_limit': quiz.time_per_question
                }
            return None
        except Exception as e:
            logger.error(f"Error getting current question: {e}")
            return None
    
    @database_sync_to_async
    def advance_question(self):
        """Advance to next question"""
        try:
            quiz = Quiz.objects.get(game_code=self.game_code)
            session = GameSession.objects.get(quiz=quiz)
            
            if session.current_question_index >= len(quiz.quiz_data['questions']) - 1:
                # Game finished
                session.status = 'FINISHED'
                session.ended_at = timezone.now()
                session.save()
                return {'success': True, 'game_ended': True}
            else:
                # Next question
                session.current_question_index += 1
                session.question_start_time = timezone.now()
                session.save()
                return {'success': True, 'game_ended': False}
                
        except Exception as e:
            logger.error(f"Error advancing question: {e}")
            return {'success': False, 'game_ended': False}
    
    @database_sync_to_async
    def get_final_leaderboard(self):
        """Get final leaderboard"""
        try:
            quiz = Quiz.objects.get(game_code=self.game_code)
            session = GameSession.objects.get(quiz=quiz)
            players = session.players.all().order_by('-score', 'nickname')
            
            return [
                {
                    'rank': i + 1,
                    'nickname': player.nickname,
                    'score': player.score,
                    'accuracy': player.accuracy,
                    'correct_answers': player.correct_answers,
                    'total_answers': player.total_answers,
                    'best_streak': player.best_streak,
                }
                for i, player in enumerate(players)
            ]
        except Exception as e:
            logger.error(f"Error getting final leaderboard: {e}")
            return []
    
    @database_sync_to_async
    def get_game_statistics(self):
        """Get comprehensive game statistics"""
        try:
            quiz = Quiz.objects.get(game_code=self.game_code)
            session = GameSession.objects.get(quiz=quiz)
            
            total_players = session.players.count()
            active_players = session.players.filter(is_connected=True).count()
            total_answers = PlayerAnswer.objects.filter(session=session).count()
            correct_answers = PlayerAnswer.objects.filter(session=session, is_correct=True).count()
            
            question_stats = QuestionStats.objects.filter(session=session).order_by('question_index')
            
            return {
                'total_players': total_players,
                'active_players': active_players,
                'total_answers': total_answers,
                'correct_answers': correct_answers,
                'accuracy_rate': round((correct_answers / total_answers * 100) if total_answers > 0 else 0, 1),
                'current_question': session.current_question_index + 1,
                'total_questions': len(quiz.quiz_data['questions']),
                'session_status': session.status,
                'question_stats': [
                    {
                        'question_index': stat.question_index,
                        'total_responses': stat.total_responses,
                        'accuracy_rate': stat.accuracy_rate,
                        'average_response_time': round(stat.average_response_time, 2),
                        'option_distribution': stat.get_option_distribution(),
                    }
                    for stat in question_stats
                ]
            }
        except Exception as e:
            logger.error(f"Error getting game statistics: {e}")
            return {}

# Utility function to broadcast leaderboard updates
async def broadcast_leaderboard_update(game_code):
    """Broadcast leaderboard update to all players"""
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    room_group_name = f'game_{game_code}'
    
    # This would be called after answer submissions
    await channel_layer.group_send(
        room_group_name,
        {
            'type': 'leaderboard_update',
            'data': {}  # Leaderboard data would be fetched here
        }
    )
