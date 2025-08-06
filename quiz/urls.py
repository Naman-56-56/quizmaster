from django.urls import path
from django.urls import path


from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('create/', views.create_quiz, name='create_quiz'),
    path('created/<str:game_code>/', views.quiz_created, name='quiz_created'),
    path('host/<str:game_code>/', views.host_game, name='host_game'),

    path('play/<str:game_code>/', views.play_game, name='play_game'),
    path('api/submit-answer/', views.submit_answer, name='submit_answer'),
    path('api/join-quiz/', views.join_quiz, name='join_quiz'),
    path('choose-quiz/', views.choose_quiz, name='choose_quiz'),
    path('api/quizzes/', views.api_quizzes, name='api_quizzes'),
    path('api/players/<str:game_code>/', views.api_players, name='api_players'),
    path('api/start-game/<str:game_code>/', views.api_start_game, name='api_start_game'),
    path('api/next-question/<str:game_code>/', views.api_next_question, name='api_next_question'),
    path('api/end-game/<str:game_code>/', views.api_end_game, name='api_end_game'),
]
