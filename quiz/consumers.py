import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Quiz, GameSession, Player

class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.game_code = self.scope['url_route']['kwargs']['game_code']
        self.room_group_name = f'game_{self.game_code}'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data['type']
        
        if message_type == 'start_game':
            await self.start_game()
        elif message_type == 'next_question':
            await self.next_question()
        elif message_type == 'end_game':
            await self.end_game()
        elif message_type == 'player_joined':
            await self.player_joined(data)
    
    async def start_game(self):
        await self.update_game_status('ACTIVE')
        question_data = await self.get_current_question()
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_started',
                'question': question_data
            }
        )
    
    async def next_question(self):
        question_data = await self.advance_question()
        
        if question_data:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'new_question',
                    'question': question_data
                }
            )
        else:
            await self.end_game()
    
    async def end_game(self):
        await self.update_game_status('FINISHED')
        leaderboard = await self.get_final_leaderboard()
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_ended',
                'leaderboard': leaderboard
            }
        )
    
    async def player_joined(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'player_update',
                'player': data['player']
            }
        )
    
    # WebSocket message handlers
    async def game_started(self, event):
        await self.send(text_data=json.dumps({
            'type': 'game_started',
            'question': event['question']
        }))
    
    async def new_question(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_question',
            'question': event['question']
        }))
    
    async def game_ended(self, event):
        await self.send(text_data=json.dumps({
            'type': 'game_ended',
            'leaderboard': event['leaderboard']
        }))
    
    async def player_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'player_update',
            'player': event['player']
        }))
    
    async def leaderboard_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'leaderboard_update',
            'leaderboard': event['leaderboard']
        }))
    
    @database_sync_to_async
    def update_game_status(self, status):
        try:
            session = GameSession.objects.get(quiz__game_code=self.game_code)
            session.status = status
            session.save()
        except GameSession.DoesNotExist:
            pass
    
    @database_sync_to_async
    def get_current_question(self):
        try:
            session = GameSession.objects.get(quiz__game_code=self.game_code)
            quiz_data = session.quiz.quiz_data
            questions = quiz_data['questions']
            
            if session.current_question_index < len(questions):
                question = questions[session.current_question_index]
                return {
                    'index': session.current_question_index,
                    'question': question['question'],
                    'options': question['options'],
                    'time_limit': session.quiz.time_per_question,
                    'question_number': session.current_question_index + 1,
                    'total_questions': len(questions)
                }
            return None
        except GameSession.DoesNotExist:
            return None
    
    @database_sync_to_async
    def advance_question(self):
        try:
            session = GameSession.objects.get(quiz__game_code=self.game_code)
            session.current_question_index += 1
            session.save()
            
            quiz_data = session.quiz.quiz_data
            questions = quiz_data['questions']
            
            if session.current_question_index < len(questions):
                question = questions[session.current_question_index]
                return {
                    'index': session.current_question_index,
                    'question': question['question'],
                    'options': question['options'],
                    'time_limit': session.quiz.time_per_question,
                    'question_number': session.current_question_index + 1,
                    'total_questions': len(questions)
                }
            return None
        except GameSession.DoesNotExist:
            return None
    
    @database_sync_to_async
    def get_final_leaderboard(self):
        try:
            session = GameSession.objects.get(quiz__game_code=self.game_code)
            players = session.players.all().order_by('-score')
            
            return [
                {
                    'rank': i + 1,
                    'nickname': player.nickname,
                    'score': player.score
                }
                for i, player in enumerate(players)
            ]
        except GameSession.DoesNotExist:
            return []
