from django.db import models
import json
import qrcode
from io import BytesIO
from django.core.files import File
import random
import string

class Quiz(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    quiz_data = models.JSONField()  # Store entire quiz as JSON
    game_code = models.CharField(max_length=6, unique=True)
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Game settings
    time_per_question = models.IntegerField(default=30)
    max_players = models.IntegerField(default=100)
    
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
        ('WAITING', 'Waiting'),
        ('ACTIVE', 'Active'),
        ('FINISHED', 'Finished'),
    ]
    
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='WAITING')
    current_question_index = models.IntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Session for {self.quiz.title}"

class Player(models.Model):
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name='players')
    name = models.CharField(max_length=50)
    score = models.IntegerField(default=0)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['session', 'name']

    def __str__(self):
        return f"{self.name} - {self.score}"
