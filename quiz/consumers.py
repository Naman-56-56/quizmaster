import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Quiz, GameSession, Player

class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
    
    async def disconnect(self, close_code):
        pass
    
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
        # Channels group_send removed
    
    async def next_question(self):
        question_data = await self.advance_question()
        # Channels group_send removed
        if not question_data:
            await self.end_game()
    
    async def end_game(self):
        await self.update_game_status('FINISHED')
        # Channels group_send removed
    
    async def player_joined(self, data):
        pass
    
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
            'type': 'game_ended'
        }))
    
    async def player_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'player_update',
            'player': event['player']
        }))
    
    
    # removed stray decorator
    def update_game_status(self, status):
        try:
            session = GameSession.objects.get(quiz__game_code=self.game_code)
            session.status = status
            session.save()
        except GameSession.DoesNotExist:
            pass
    
    # removed stray decorator
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
    
    # removed stray decorator
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
    
    # removed stray decorator
