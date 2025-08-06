from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('create/', views.create_quiz, name='create_quiz'),
    path('created/<str:game_code>/', views.quiz_created, name='quiz_created'),
    path('host/<str:game_code>/', views.host_game, name='host_game'),
    path('join/<str:game_code>/', views.join_game, name='join_game'),
    path('play/<str:game_code>/', views.play_game, name='play_game'),
    path('api/submit-answer/', views.submit_answer, name='submit_answer'),
    path('api/leaderboard/<str:game_code>/', views.leaderboard, name='leaderboard'),
]
