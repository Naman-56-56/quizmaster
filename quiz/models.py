from django.db import models
from django.utils import timezone
import json
import qrcode
from io import BytesIO
from django.core.files import File
import random
import string
import uuid

class Quiz(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    quiz_data = models.JSONField()  # Store questions as JSON
    game_code = models.CharField(max_length=6, unique=True)
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Game settings
    time_per_question = models.IntegerField(default=30)  # seconds
    max_players = models.IntegerField(default=200)
    points_per_question = models.IntegerField(default=1000)
    
    def save(self, *args, **kwargs):
        if not self.game_code:
            self.game_code = self.generate_game_code()
        super().save(*args, **kwargs)
        if not self.qr_code:
            self.generate_qr_code()
    
    def generate_game_code(self):
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            if not Quiz.objects.filter(game_code=code).exists():
                return code
    
    def generate_qr_code(self):
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        join_url = f"http://localhost:8000/join/{self.game_code}/"
        qr.add_data(join_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        self.qr_code.save(
            f'qr_{self.game_code}.png',
            File(buffer),
            save=False
        )
        self.save()
    
    def __str__(self):
        return f"{self.title} - {self.game_code}"

class GameSession(models.Model):
    STATUS_CHOICES = [
        ('WAITING', 'Waiting for Players'),
        ('ACTIVE', 'Game Active'),
        ('PAUSED', 'Game Paused'),
        ('FINISHED', 'Game Finished'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='sessions')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='WAITING')
    current_question_index = models.IntegerField(default=0)
    question_start_time = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    def get_current_question(self):
        if self.current_question_index < len(self.quiz.quiz_data['questions']):
            return self.quiz.quiz_data['questions'][self.current_question_index]
        return None
    
    def get_total_questions(self):
        return len(self.quiz.quiz_data['questions'])
    
    def is_last_question(self):
        return self.current_question_index >= self.get_total_questions() - 1
    
    def __str__(self):
        return f"Session for {self.quiz.title} - {self.status}"

class Player(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name='players')
    nickname = models.CharField(max_length=50)
    score = models.IntegerField(default=0)
    correct_answers = models.IntegerField(default=0)
    total_answers = models.IntegerField(default=0)
    current_streak = models.IntegerField(default=0)
    best_streak = models.IntegerField(default=0)
    joined_at = models.DateTimeField(auto_now_add=True)
    is_connected = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['session', 'nickname']
        ordering = ['-score', 'nickname']
    
    @property
    def accuracy(self):
        if self.total_answers == 0:
            return 0
        return round((self.correct_answers / self.total_answers) * 100, 1)
    
    def __str__(self):
        return f"{self.nickname} - {self.score} points"

class PlayerAnswer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='answers')
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE)
    question_index = models.IntegerField()
    selected_answer = models.CharField(max_length=10)  # A, B, C, D
    is_correct = models.BooleanField()
    points_earned = models.IntegerField(default=0)
    response_time = models.FloatField()  # Time in seconds from question start
    answered_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['player', 'session', 'question_index']
        ordering = ['answered_at']
    
    def calculate_points(self):
        """Calculate points based on correctness, speed, and difficulty"""
        if not self.is_correct:
            return 0
        
        base_points = self.session.quiz.points_per_question
        time_limit = self.session.quiz.time_per_question
        
        # Speed bonus: faster answers get more points (up to 50% bonus)
        speed_bonus = max(0, (time_limit - self.response_time) / time_limit * 0.5)
        
        # Calculate final points
        total_points = int(base_points * (1 + speed_bonus))
        
        return total_points
    
    def __str__(self):
        return f"{self.player.nickname} - Q{self.question_index + 1} - {self.points_earned}pts"

class QuestionStats(models.Model):
    """Track statistics for each question in a session"""
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE)
    question_index = models.IntegerField()
    total_responses = models.IntegerField(default=0)
    correct_responses = models.IntegerField(default=0)
    option_a_count = models.IntegerField(default=0)
    option_b_count = models.IntegerField(default=0)
    option_c_count = models.IntegerField(default=0)
    option_d_count = models.IntegerField(default=0)
    average_response_time = models.FloatField(default=0.0)
    
    class Meta:
        unique_together = ['session', 'question_index']
    
    @property
    def accuracy_rate(self):
        if self.total_responses == 0:
            return 0
        return round((self.correct_responses / self.total_responses) * 100, 1)
    
    def get_option_distribution(self):
        return {
            'A': self.option_a_count,
            'B': self.option_b_count,
            'C': self.option_c_count,
            'D': self.option_d_count,
        }
