from django.urls import path
from . import views

urlpatterns = [
    # Main pages
    path('', views.home, name='home'),
    path('create/', views.create_quiz, name='create_quiz'),
    path('created/<str:game_code>/', views.quiz_created, name='quiz_created'),
    
    # Game management
    path('host/<str:game_code>/', views.host_game, name='host_game'),
    path('join/<str:game_code>/', views.join_game, name='join_game'),
    path('play/<str:game_code>/', views.play_game, name='play_game'),
    path('results/<str:game_code>/', views.game_results, name='game_results'),
    
    # API endpoints
    path('api/submit-answer/', views.submit_answer, name='submit_answer'),
    path('api/leaderboard/<str:game_code>/', views.leaderboard, name='leaderboard'),
    path('api/start-game/<str:game_code>/', views.start_game, name='start_game'),
    path('api/next-question/<str:game_code>/', views.next_question, name='next_question'),
    path('api/end-game/<str:game_code>/', views.end_game, name='end_game'),
]
