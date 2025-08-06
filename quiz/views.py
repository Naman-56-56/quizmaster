from django.core.serializers import serialize
def api_quizzes(request):
    quizzes = Quiz.objects.all().order_by('-created_at')
    quiz_list = [
        {
            'title': quiz.title,
            'description': quiz.description,
            'game_code': quiz.game_code
        }
        for quiz in quizzes
    ]
    return JsonResponse({'quizzes': quiz_list})
def choose_quiz(request):
    return render(request, 'quiz/choose_quiz.html')
from django.views.decorators.csrf import csrf_exempt
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
@csrf_exempt
def join_quiz(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        if not name:
            return JsonResponse({'error': 'Name is required'}, status=400)

        # For demo: always create a new session for each join (or you can customize logic)
        session = GameSession.objects.create(
            quiz=Quiz.objects.first(),  # You may want to select a quiz differently
            status='WAITING'
        )
        player = Player.objects.create(session=session, name=name)
        # Notify host via WebSocket
        return JsonResponse({'success': True, 'player_id': player.id, 'session_id': session.id})
    return JsonResponse({'error': 'Invalid request'}, status=400)
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Quiz, GameSession, Player
import json

def home(request):
    return render(request, 'quiz/home.html')

def create_quiz(request):
    if request.method == 'POST':
        # Get form data
        title = request.POST.get('title')
        description = request.POST.get('description', '')
        time_per_question = int(request.POST.get('time_per_question', 30))
        
        # Get questions data (JSON format)
        questions_json = request.POST.get('questions_data')
        
        try:
            quiz_data = json.loads(questions_json)
            
            # Create quiz
            quiz = Quiz.objects.create(
                title=title,
                description=description,
                quiz_data=quiz_data,
                time_per_question=time_per_question
            )
            
            return redirect('quiz_created', game_code=quiz.game_code)
            
        except json.JSONDecodeError:
            return render(request, 'quiz/create_quiz.html', {
                'error': 'Invalid JSON format for questions'
            })
    
    return render(request, 'quiz/create_quiz.html')

def quiz_created(request, game_code):
    quiz = get_object_or_404(Quiz, game_code=game_code)
    return render(request, 'quiz/quiz_created.html', {'quiz': quiz})

def host_game(request, game_code):
    quiz = get_object_or_404(Quiz, game_code=game_code)
    
    # Get or create game session
    session, created = GameSession.objects.get_or_create(
        quiz=quiz,
        defaults={'status': 'WAITING'}
    )
    
    players = session.players.all().order_by('-score')
    
    return render(request, 'quiz/host_game.html', {
        'quiz': quiz,
        'session': session,
        'players': players
    })



def play_game(request, game_code):
    quiz = get_object_or_404(Quiz, game_code=game_code)
    player_id = request.session.get('player_id')
    
    if not player_id:
        return redirect('join_game', game_code=game_code)
    
    try:
        player = Player.objects.get(id=player_id)
    except Player.DoesNotExist:
        return redirect('join_game', game_code=game_code)
    
    return render(request, 'quiz/play_game.html', {
        'quiz': quiz,
        'player': player
    })

@csrf_exempt
def submit_answer(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        player_id = request.session.get('player_id')
        
        if not player_id:
            return JsonResponse({'error': 'Not authenticated'}, status=401)
        
        player = get_object_or_404(Player, id=player_id)
        question_index = data.get('question_index')
        selected_answer = data.get('selected_answer')
        response_time = data.get('response_time', 0)
        
        # Get correct answer from quiz data
        quiz_data = player.session.quiz.quiz_data
        if question_index < len(quiz_data['questions']):
            question = quiz_data['questions'][question_index]
            correct_answer = question['correct_answer']
            
            is_correct = selected_answer == correct_answer
            
            # Calculate points (faster answers get more points)
            points = 0
            if is_correct:
                base_points = question.get('points', 100)
                time_bonus = max(0, (30 - response_time) / 30 * 50)  # Up to 50 bonus points
                points = int(base_points + time_bonus)
            
            # Update player score
            player.score += points
            player.save()
            
            return JsonResponse({
                'correct': is_correct,
                'points_earned': points,
                'total_score': player.score,
                'correct_answer': correct_answer
            })
        
        return JsonResponse({'error': 'Invalid question'}, status=400)
    
    return JsonResponse({'error': 'Invalid request'}, status=400)

    # leaderboard view removed
