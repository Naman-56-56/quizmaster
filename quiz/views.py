from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.db import transaction
from django.core.paginator import Paginator
from .models import Quiz, GameSession, Player, PlayerAnswer, QuestionStats
import json
import logging

logger = logging.getLogger(__name__)

def home(request):
    """Home page with options to create or join quiz"""
    return render(request, 'quiz/home.html')

@require_http_methods(["GET", "POST"])
def create_quiz(request):
    """Create a new quiz"""
    if request.method == 'POST':
        try:
            title = request.POST.get('title', '').strip()
            description = request.POST.get('description', '').strip()
            time_per_question = int(request.POST.get('time_per_question', 30))
            max_players = int(request.POST.get('max_players', 200))
            points_per_question = int(request.POST.get('points_per_question', 1000))
            
            # Get questions data (JSON format)
            questions_json = request.POST.get('questions_data', '').strip()
            
            if not title:
                raise ValueError("Quiz title is required")
            
            if not questions_json:
                raise ValueError("Questions data is required")
            
            quiz_data = json.loads(questions_json)
            
            # Validate quiz data structure
            if 'questions' not in quiz_data or not quiz_data['questions']:
                raise ValueError("Quiz must contain at least one question")
            
            # Create quiz
            quiz = Quiz.objects.create(
                title=title,
                description=description,
                quiz_data=quiz_data,
                time_per_question=time_per_question,
                max_players=max_players,
                points_per_question=points_per_question
            )
            
            logger.info(f"Quiz created: {quiz.title} with code {quiz.game_code}")
            return redirect('quiz_created', game_code=quiz.game_code)
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return render(request, 'quiz/create_quiz.html', {
                'error': 'Invalid JSON format for questions'
            })
        except ValueError as e:
            logger.error(f"Validation error: {e}")
            return render(request, 'quiz/create_quiz.html', {
                'error': str(e)
            })
        except Exception as e:
            logger.error(f"Unexpected error creating quiz: {e}")
            return render(request, 'quiz/create_quiz.html', {
                'error': 'An unexpected error occurred. Please try again.'
            })
    
    return render(request, 'quiz/create_quiz.html')

def quiz_created(request, game_code):
    """Show quiz creation success page"""
    quiz = get_object_or_404(Quiz, game_code=game_code)
    return render(request, 'quiz/quiz_created.html', {'quiz': quiz})

def host_game(request, game_code):
    """Host game control panel"""
    quiz = get_object_or_404(Quiz, game_code=game_code)
    
    # Get or create game session
    session, created = GameSession.objects.get_or_create(
        quiz=quiz,
        status__in=['WAITING', 'ACTIVE', 'PAUSED'],
        defaults={'status': 'WAITING'}
    )
    
    # Get players and stats
    players = session.players.filter(is_connected=True).order_by('-score', 'nickname')
    total_players = players.count()
    
    # Get current question if game is active
    current_question = None
    if session.status == 'ACTIVE':
        current_question = session.get_current_question()
    
    context = {
        'quiz': quiz,
        'session': session,
        'players': players,
        'total_players': total_players,
        'current_question': current_question,
        'total_questions': session.get_total_questions(),
    }
    
    return render(request, 'quiz/host_game.html', context)

@require_http_methods(["GET", "POST"])
def join_game(request, game_code):
    """Join a game session"""
    quiz = get_object_or_404(Quiz, game_code=game_code, is_active=True)
    
    if request.method == 'POST':
        nickname = request.POST.get('nickname', '').strip()
        
        if not nickname:
            return render(request, 'quiz/join_game.html', {
                'quiz': quiz,
                'error': 'Please enter a nickname'
            })
        
        if len(nickname) > 50:
            return render(request, 'quiz/join_game.html', {
                'quiz': quiz,
                'error': 'Nickname must be 50 characters or less'
            })
        
        try:
            # Get or create session
            session, created = GameSession.objects.get_or_create(
                quiz=quiz,
                status__in=['WAITING', 'ACTIVE'],
                defaults={'status': 'WAITING'}
            )
            
            # Check if session is full
            if session.players.filter(is_connected=True).count() >= quiz.max_players:
                return render(request, 'quiz/join_game.html', {
                    'quiz': quiz,
                    'error': f'Game is full (max {quiz.max_players} players)'
                })
            
            # Check if nickname is taken
            if session.players.filter(nickname=nickname, is_connected=True).exists():
                return render(request, 'quiz/join_game.html', {
                    'quiz': quiz,
                    'error': 'Nickname already taken'
                })
            
            # Create or reactivate player
            player, created = Player.objects.get_or_create(
                session=session,
                nickname=nickname,
                defaults={'is_connected': True}
            )
            
            if not created:
                player.is_connected = True
                player.save()
            
            # Store player info in session
            request.session['player_id'] = str(player.id)
            request.session['session_id'] = str(session.id)
            request.session['game_code'] = game_code
            
            logger.info(f"Player {nickname} joined session {session.id}")
            return redirect('play_game', game_code=game_code)
            
        except Exception as e:
            logger.error(f"Error joining game: {e}")
            return render(request, 'quiz/join_game.html', {
                'quiz': quiz,
                'error': 'Unable to join game. Please try again.'
            })
    
    return render(request, 'quiz/join_game.html', {'quiz': quiz})

def play_game(request, game_code):
    """Player game interface"""
    quiz = get_object_or_404(Quiz, game_code=game_code)
    player_id = request.session.get('player_id')
    session_id = request.session.get('session_id')
    
    if not player_id or not session_id:
        return redirect('join_game', game_code=game_code)
    
    try:
        player = Player.objects.get(id=player_id, session_id=session_id)
        session = player.session
        
        # Mark player as connected
        player.is_connected = True
        player.save()
        
        context = {
            'quiz': quiz,
            'player': player,
            'session': session,
            'total_questions': session.get_total_questions(),
        }
        
        return render(request, 'quiz/play_game.html', context)
        
    except Player.DoesNotExist:
        logger.warning(f"Player {player_id} not found, redirecting to join")
        return redirect('join_game', game_code=game_code)

@csrf_exempt
@require_http_methods(["POST"])
def submit_answer(request):
    """Submit player answer with timestamp"""
    try:
        data = json.loads(request.body)
        player_id = request.session.get('player_id')
        
        if not player_id:
            return JsonResponse({'error': 'Not authenticated'}, status=401)
        
        player = get_object_or_404(Player, id=player_id)
        session = player.session
        
        question_index = data.get('question_index')
        selected_answer = data.get('selected_answer', '').upper()
        response_time = float(data.get('response_time', 0))
        
        # Validate input
        if question_index is None or not selected_answer:
            return JsonResponse({'error': 'Invalid input'}, status=400)
        
        if selected_answer not in ['A', 'B', 'C', 'D']:
            return JsonResponse({'error': 'Invalid answer option'}, status=400)
        
        # Check if question exists
        if question_index >= session.get_total_questions():
            return JsonResponse({'error': 'Invalid question index'}, status=400)
        
        # Check if already answered
        if PlayerAnswer.objects.filter(
            player=player, 
            session=session, 
            question_index=question_index
        ).exists():
            return JsonResponse({'error': 'Already answered this question'}, status=400)
        
        with transaction.atomic():
            # Get question data
            question = session.quiz.quiz_data['questions'][question_index]
            correct_answer = question['correct_answer'].upper()
            is_correct = selected_answer == correct_answer
            
            # Create answer record
            answer = PlayerAnswer.objects.create(
                player=player,
                session=session,
                question_index=question_index,
                selected_answer=selected_answer,
                is_correct=is_correct,
                response_time=response_time
            )
            
            # Calculate points
            points_earned = answer.calculate_points()
            answer.points_earned = points_earned
            answer.save()
            
            # Update player stats
            player.total_answers += 1
            if is_correct:
                player.correct_answers += 1
                player.current_streak += 1
                player.best_streak = max(player.best_streak, player.current_streak)
            else:
                player.current_streak = 0
            
            player.score += points_earned
            player.save()
            
            # Update question stats
            question_stats, created = QuestionStats.objects.get_or_create(
                session=session,
                question_index=question_index,
                defaults={
                    'total_responses': 0,
                    'correct_responses': 0,
                    'option_a_count': 0,
                    'option_b_count': 0,
                    'option_c_count': 0,
                    'option_d_count': 0,
                    'average_response_time': 0.0,
                }
            )
            
            # Update stats
            question_stats.total_responses += 1
            if is_correct:
                question_stats.correct_responses += 1
            
            # Update option counts
            option_field = f'option_{selected_answer.lower()}_count'
            setattr(question_stats, option_field, getattr(question_stats, option_field) + 1)
            
            # Update average response time
            total_time = question_stats.average_response_time * (question_stats.total_responses - 1)
            question_stats.average_response_time = (total_time + response_time) / question_stats.total_responses
            
            question_stats.save()
        
        # Prepare response
        response_data = {
            'correct': is_correct,
            'points_earned': points_earned,
            'total_score': player.score,
            'correct_answer': correct_answer,
            'current_streak': player.current_streak,
            'accuracy': player.accuracy,
            'question_explanation': question.get('explanation', ''),
        }
        
        logger.info(f"Answer submitted: {player.nickname} - Q{question_index + 1} - {points_earned}pts")
        return JsonResponse(response_data)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        logger.error(f"Error submitting answer: {e}")
        return JsonResponse({'error': 'Server error'}, status=500)

def leaderboard(request, game_code):
    """Get current leaderboard"""
    try:
        quiz = get_object_or_404(Quiz, game_code=game_code)
        session = GameSession.objects.filter(quiz=quiz).first()
        
        if not session:
            return JsonResponse({'leaderboard': [], 'total_players': 0})
        
        # Get top players
        players = session.players.filter(is_connected=True).order_by('-score', 'nickname')[:50]
        
        leaderboard_data = []
        for i, player in enumerate(players):
            leaderboard_data.append({
                'rank': i + 1,
                'nickname': player.nickname,
                'score': player.score,
                'accuracy': player.accuracy,
                'current_streak': player.current_streak,
                'best_streak': player.best_streak,
                'total_answers': player.total_answers,
                'is_connected': player.is_connected,
            })
        
        total_players = session.players.filter(is_connected=True).count()
        
        return JsonResponse({
            'leaderboard': leaderboard_data,
            'total_players': total_players,
            'session_status': session.status,
            'current_question': session.current_question_index + 1,
            'total_questions': session.get_total_questions(),
        })
        
    except Exception as e:
        logger.error(f"Error getting leaderboard: {e}")
        return JsonResponse({'error': 'Server error'}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def start_game(request, game_code):
    """Start the game session"""
    try:
        quiz = get_object_or_404(Quiz, game_code=game_code)
        session = get_object_or_404(GameSession, quiz=quiz, status='WAITING')
        
        session.status = 'ACTIVE'
        session.started_at = timezone.now()
        session.question_start_time = timezone.now()
        session.current_question_index = 0
        session.save()
        
        logger.info(f"Game started: {game_code}")
        return JsonResponse({'success': True, 'message': 'Game started'})
        
    except Exception as e:
        logger.error(f"Error starting game: {e}")
        return JsonResponse({'error': 'Failed to start game'}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def next_question(request, game_code):
    """Move to next question"""
    try:
        quiz = get_object_or_404(Quiz, game_code=game_code)
        session = get_object_or_404(GameSession, quiz=quiz, status='ACTIVE')
        
        if session.is_last_question():
            # End game
            session.status = 'FINISHED'
            session.ended_at = timezone.now()
            session.save()
            return JsonResponse({'success': True, 'game_ended': True})
        else:
            # Next question
            session.current_question_index += 1
            session.question_start_time = timezone.now()
            session.save()
            return JsonResponse({'success': True, 'game_ended': False})
        
    except Exception as e:
        logger.error(f"Error moving to next question: {e}")
        return JsonResponse({'error': 'Failed to advance question'}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def end_game(request, game_code):
    """End the game session"""
    try:
        quiz = get_object_or_404(Quiz, game_code=game_code)
        session = get_object_or_404(GameSession, quiz=quiz)
        
        session.status = 'FINISHED'
        session.ended_at = timezone.now()
        session.save()
        
        logger.info(f"Game ended: {game_code}")
        return JsonResponse({'success': True, 'message': 'Game ended'})
        
    except Exception as e:
        logger.error(f"Error ending game: {e}")
        return JsonResponse({'error': 'Failed to end game'}, status=500)

def game_results(request, game_code):
    """Show final game results"""
    quiz = get_object_or_404(Quiz, game_code=game_code)
    session = get_object_or_404(GameSession, quiz=quiz, status='FINISHED')
    
    # Get final leaderboard
    players = session.players.all().order_by('-score', 'nickname')
    
    # Get question statistics
    question_stats = QuestionStats.objects.filter(session=session).order_by('question_index')
    
    context = {
        'quiz': quiz,
        'session': session,
        'players': players,
        'question_stats': question_stats,
        'total_players': players.count(),
    }
    
    return render(request, 'quiz/game_results.html', context)
