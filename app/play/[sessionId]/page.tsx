'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Trophy, Clock, Users, CheckCircle, XCircle, Star, Zap, Target, Crown, TrendingUp, Sparkles } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { QuizWebSocketClient } from '@/lib/websocket-client'
import RealtimeLeaderboard from '@/components/realtime-leaderboard'

interface Player {
  id: string
  nickname: string
  score: number
  rank: number
  trend?: 'up' | 'down' | 'same'
}

interface Question {
  id: string
  text: string
  type: 'multiple_choice' | 'true_false'
  options: string[]
  time_limit: number
}

interface GameState {
  status: 'waiting' | 'question' | 'results' | 'leaderboard' | 'finished'
  current_question?: Question
  question_number?: number
  total_questions?: number
  time_remaining?: number
  players: Player[]
  my_score?: number
  my_rank?: number
  my_previous_rank?: number
}

export default function PlayPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const [gameState, setGameState] = useState<GameState>({ status: 'waiting', players: [] })
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [nickname, setNickname] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [answerStreak, setAnswerStreak] = useState(0)
  const wsRef = useRef<QuizWebSocketClient | null>(null)
  const playerId = useRef<string>('')

  useEffect(() => {
    // Get player info from localStorage
    playerId.current = localStorage.getItem('player_id') || ''
    const storedNickname = localStorage.getItem('player_nickname') || 'Player'
    setNickname(storedNickname)

    if (!playerId.current) {
      router.push('/join')
      return
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect()
      }
    }
  }, [sessionId, router])

  const connectWebSocket = async () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/ws/game/${sessionId}`
      
      wsRef.current = new QuizWebSocketClient(wsUrl)
      
      // Set up event handlers
      wsRef.current.on('*', (data: any) => {
        console.log('WebSocket message:', data)
      })

      wsRef.current.on('game_state', (data: any) => {
        setGameState(data.state)
        setConnectionStatus('connected')
        if (data.state.status === 'question') {
          resetQuestionState()
        }
      })

      wsRef.current.on('game_started', (data: any) => {
        setGameState(prev => ({
          ...prev,
          status: 'question',
          current_question: data.question,
          question_number: data.question.question_number,
          total_questions: data.question.total_questions,
          time_remaining: data.question.time_limit
        }))
        resetQuestionState()
        startTimer(data.question.time_limit)
      })

      wsRef.current.on('new_question', (data: any) => {
        setGameState(prev => ({
          ...prev,
          status: 'question',
          current_question: data.question,
          question_number: data.question.question_number,
          total_questions: data.question.total_questions,
          time_remaining: data.question.time_limit
        }))
        resetQuestionState()
        startTimer(data.question.time_limit)
      })

      wsRef.current.on('answer_result', (data: any) => {
        setIsCorrect(data.correct)
        setPointsEarned(data.points_earned || 0)
        
        if (data.correct) {
          setAnswerStreak(prev => prev + 1)
          setShowCelebration(true)
          setTimeout(() => setShowCelebration(false), 2000)
        } else {
          setAnswerStreak(0)
        }

        // Update my score
        setGameState(prev => ({
          ...prev,
          my_score: data.total_score,
          my_previous_rank: prev.my_rank
        }))
      })

      wsRef.current.on('leaderboard_update', (data: any) => {
        const myPlayer = data.players.find((p: Player) => p.id === playerId.current)
        
        setGameState(prev => ({
          ...prev,
          players: data.players,
          my_score: myPlayer?.score || prev.my_score,
          my_rank: myPlayer?.rank || prev.my_rank
        }))
      })

      wsRef.current.on('time_update', (data: any) => {
        setGameState(prev => ({
          ...prev,
          time_remaining: data.time_remaining
        }))
      })

      wsRef.current.on('game_ended', (data: any) => {
        setGameState(prev => ({
          ...prev,
          status: 'finished',
          players: data.final_leaderboard || data.leaderboard || prev.players
        }))
      })

      // Connect
      await wsRef.current.connect()
      
      // Send join message
      wsRef.current.send({
        type: 'join',
        player_id: playerId.current
      })

    } catch (error) {
      console.error('WebSocket connection failed:', error)
      setConnectionStatus('disconnected')
    }
  }

  const resetQuestionState = () => {
    setSelectedAnswer(null)
    setHasAnswered(false)
    setIsCorrect(null)
    setPointsEarned(0)
  }

  const startTimer = (duration: number) => {
    let timeLeft = duration
    const timer = setInterval(() => {
      timeLeft--
      setGameState(prev => ({ ...prev, time_remaining: timeLeft }))
      
      if (timeLeft <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  }

  const submitAnswer = (answerIndex: number) => {
    if (hasAnswered || !wsRef.current?.isConnected()) return

    setSelectedAnswer(answerIndex)
    setHasAnswered(true)

    wsRef.current.send({
      type: 'answer',
      player_id: playerId.current,
      question_id: gameState.current_question?.id,
      answer: answerIndex,
      timestamp: Date.now()
    })
  }

  const renderConnectionStatus = () => {
    if (connectionStatus === 'connected') return null

    return (
      <div className="fixed top-4 right-4 z-50">
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-3 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <span className="text-sm font-medium">
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderWaitingScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      {renderConnectionStatus()}
      
      <div className="max-w-4xl mx-auto text-center">
        <div className="animate-bounce mb-8">
          <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto shadow-2xl">
            <Users className="h-16 w-16 text-white" />
          </div>
        </div>
        
        <h2 className="text-5xl font-bold text-white mb-6">Get Ready!</h2>
        <p className="text-2xl text-white/80 mb-12">The quiz will start soon...</p>
        
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 mb-12 shadow-2xl">
          <CardContent className="p-12">
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-6 shadow-lg">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-3xl font-bold text-white mb-2">Welcome, {nickname}!</h3>
                <p className="text-white/70 text-lg">You're connected and ready to compete</p>
              </div>
            </div>
            
            {answerStreak > 0 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-400/30">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-6 w-6 text-yellow-400" />
                  <span className="text-yellow-200 font-semibold">
                    {answerStreak} answer streak!
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all">
            <CardContent className="p-8 text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">{gameState.players.length}</div>
              <div className="text-white/70 text-lg">Players Joined</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all">
            <CardContent className="p-8 text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">#{gameState.my_rank || '-'}</div>
              <div className="text-white/70 text-lg">Your Rank</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all">
            <CardContent className="p-8 text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">{gameState.my_score || 0}</div>
              <div className="text-white/70 text-lg">Your Score</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )

  const renderQuestion = () => {
    if (!gameState.current_question) return null

    const timeProgress = gameState.time_remaining 
      ? (gameState.time_remaining / gameState.current_question.time_limit) * 100 
      : 0

    const isTimeRunningOut = (gameState.time_remaining || 0) <= 5

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
        {renderConnectionStatus()}
        
        {showCelebration && (
          <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
            <div className="text-8xl animate-bounce">🎉</div>
          </div>
        )}
        
        <div className="max-w-6xl mx-auto">
          {/* Enhanced Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-6">
              <Badge variant="outline" className="text-white border-white/30 bg-white/10 backdrop-blur-sm px-6 py-3 text-xl font-bold">
                Question {gameState.question_number} of {gameState.total_questions}
              </Badge>
              
              {gameState.my_rank && gameState.my_previous_rank && gameState.my_rank !== gameState.my_previous_rank && (
                <Badge className={`px-4 py-2 text-lg ${
                  gameState.my_rank < gameState.my_previous_rank 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'bg-red-500 hover:bg-red-600'
                }`}>
                  <TrendingUp className={`h-4 w-4 mr-1 ${
                    gameState.my_rank > gameState.my_previous_rank ? 'rotate-180' : ''
                  }`} />
                  Rank #{gameState.my_rank}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center justify-center gap-6 mb-8">
              <Clock className={`h-12 w-12 ${isTimeRunningOut ? 'text-red-400 animate-pulse' : 'text-orange-400'}`} />
              <span className={`text-6xl font-bold ${isTimeRunningOut ? 'text-red-300 animate-pulse' : 'text-orange-300'}`}>
                {gameState.time_remaining}s
              </span>
            </div>
            
            <div className="max-w-3xl mx-auto">
              <Progress 
                value={timeProgress} 
                className={`h-6 bg-white/20 mb-4 ${isTimeRunningOut ? 'animate-pulse' : ''}`}
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Question Card */}
            <div className="lg:col-span-2">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-2xl">
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-4xl text-white leading-relaxed font-bold">
                    {gameState.current_question.text}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6">
                    {gameState.current_question.options.map((option, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className={`p-8 h-auto text-left justify-start text-xl border-3 transition-all duration-300 transform hover:scale-102 ${
                          selectedAnswer === index 
                            ? hasAnswered
                              ? isCorrect 
                                ? 'bg-green-500 hover:bg-green-600 text-white border-green-400 shadow-2xl scale-105 animate-pulse' 
                                : 'bg-red-500 hover:bg-red-600 text-white border-red-400 shadow-2xl'
                              : 'bg-blue-500 hover:bg-blue-600 text-white border-blue-400 shadow-2xl scale-105'
                            : 'bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50 hover:shadow-xl'
                        }`}
                        onClick={() => submitAnswer(index)}
                        disabled={hasAnswered}
                      >
                        <div className="flex items-center gap-6 w-full">
                          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold shadow-lg">
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="flex-1 text-lg">{option}</span>
                          {hasAnswered && selectedAnswer === index && (
                            <div className="ml-auto">
                              {isCorrect ? (
                                <CheckCircle className="h-10 w-10 text-white" />
                              ) : (
                                <XCircle className="h-10 w-10 text-white" />
                              )}
                            </div>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>

                  {hasAnswered && (
                    <Card className="mt-8 bg-white/5 backdrop-blur-sm border-white/10 shadow-xl">
                      <CardContent className="p-8 text-center">
                        <div className="flex items-center justify-center gap-4 mb-4">
                          {isCorrect ? (
                            <>
                              <Star className="h-8 w-8 text-yellow-400" />
                              <span className="text-2xl text-white font-bold">Excellent!</span>
                            </>
                          ) : (
                            <>
                              <Target className="h-8 w-8 text-orange-400" />
                              <span className="text-2xl text-white font-bold">Good try!</span>
                            </>
                          )}
                        </div>
                        
                        {pointsEarned > 0 && (
                          <div className="text-3xl font-bold text-green-400 mb-2">
                            +{pointsEarned} points!
                          </div>
                        )}
                        
                        <p className="text-white/70 text-lg">Waiting for other players...</p>
                        
                        {answerStreak > 1 && (
                          <div className="mt-4 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-400/30">
                            <div className="flex items-center justify-center gap-2">
                              <Sparkles className="h-6 w-6 text-yellow-400" />
                              <span className="text-yellow-200 font-bold text-lg">
                                {answerStreak} in a row! 🔥
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Live Stats Sidebar */}
            <div className="space-y-6">
              {/* Player Stats */}
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-xl flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-yellow-400" />
                    Your Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-white/5 rounded-lg">
                      <div className="text-3xl font-bold text-blue-400">{gameState.my_score || 0}</div>
                      <div className="text-white/70 text-sm">Score</div>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded-lg">
                      <div className="text-3xl font-bold text-purple-400">#{gameState.my_rank || '-'}</div>
                      <div className="text-white/70 text-sm">Rank</div>
                    </div>
                  </div>
                  
                  {answerStreak > 0 && (
                    <div className="text-center p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-400/30">
                      <div className="text-2xl font-bold text-yellow-400">{answerStreak}</div>
                      <div className="text-yellow-200 text-sm">Streak</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Mini Leaderboard */}
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-xl flex items-center gap-2">
                    <Crown className="h-6 w-6 text-yellow-400" />
                    Top Players
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {gameState.players.slice(0, 5).map((player, index) => (
                      <div 
                        key={player.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          player.id === playerId.current 
                            ? 'bg-blue-500/20 border border-blue-400/30' 
                            : 'bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-orange-500 text-white' :
                            'bg-blue-500 text-white'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="text-white font-medium text-sm">
                            {player.nickname}
                            {player.id === playerId.current && ' (You)'}
                          </span>
                        </div>
                        <span className="text-white font-bold">{player.score}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderLeaderboard = () => (
    <div className="min-h-screen bg-gradient-to-br from-yellow-900 via-orange-900 to-red-900 p-4">
      {renderConnectionStatus()}
      
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-32 h-32 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <Trophy className="h-16 w-16 text-white" />
          </div>
          <h2 className="text-6xl font-bold text-white mb-6">Live Leaderboard</h2>
          <p className="text-2xl text-white/80">Current standings after question {gameState.question_number}</p>
        </div>

        <RealtimeLeaderboard 
          sessionId={sessionId}
          currentPlayerId={playerId.current}
          maxPlayers={20}
          showTrends={true}
          showStats={true}
          updateInterval={500}
        />
      </div>
    </div>
  )

  const renderFinished = () => {
    const myFinalRank = gameState.players.findIndex(p => p.id === playerId.current) + 1
    const myFinalScore = gameState.players.find(p => p.id === playerId.current)?.score || gameState.my_score || 0
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 flex items-center justify-center p-4">
        {renderConnectionStatus()}
        
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-bounce mb-12">
            <Trophy className="h-40 w-40 text-yellow-400 mx-auto" />
          </div>
          
          <h2 className="text-7xl font-bold text-white mb-8">Quiz Complete!</h2>
          <p className="text-3xl text-white/80 mb-16">Thanks for playing, {nickname}!</p>

          <Card className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border-purple-400/30 shadow-2xl mb-12">
            <CardContent className="p-16">
              <div className="grid md:grid-cols-3 gap-12 text-center">
                <div>
                  <Zap className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                  <p className="text-2xl text-white/90 mb-2">Final Score</p>
                  <p className="text-7xl font-bold text-white">{myFinalScore.toLocaleString()}</p>
                </div>
                <div>
                  <Crown className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                  <p className="text-2xl text-white/90 mb-2">Final Rank</p>
                  <p className="text-7xl font-bold text-purple-300">#{myFinalRank}</p>
                </div>
                <div>
                  <Users className="h-16 w-16 text-pink-400 mx-auto mb-4" />
                  <p className="text-2xl text-white/90 mb-2">Out of</p>
                  <p className="text-7xl font-bold text-pink-300">{gameState.players.length}</p>
                </div>
              </div>
              
              {myFinalRank <= 3 && (
                <div className="mt-12 p-8 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl border border-yellow-400/30">
                  <div className="flex items-center justify-center gap-4">
                    <Sparkles className="h-12 w-12 text-yellow-400" />
                    <span className="text-3xl font-bold text-yellow-200">
                      {myFinalRank === 1 ? '🏆 Champion!' : 
                       myFinalRank === 2 ? '🥈 Runner-up!' : 
                       '🥉 Third Place!'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Final Leaderboard */}
          <RealtimeLeaderboard 
            sessionId={sessionId}
            currentPlayerId={playerId.current}
            maxPlayers={10}
            showTrends={false}
            showStats={false}
            updateInterval={5000}
          />

          <div className="mt-12">
            <Button 
              onClick={() => window.location.href = '/'}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-16 py-6 text-2xl rounded-2xl shadow-2xl transform hover:scale-105 transition-all"
            >
              Play Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {gameState.status === 'waiting' && renderWaitingScreen()}
      {gameState.status === 'question' && renderQuestion()}
      {gameState.status === 'leaderboard' && renderLeaderboard()}
      {gameState.status === 'finished' && renderFinished()}
    </>
  )
}
