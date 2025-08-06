'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Pause, SkipForward, Users, Trophy, QrCode, BarChart3, Settings, Clock, Target, Zap, Crown } from 'lucide-react'
import { useParams } from 'next/navigation'
import QRCodeDisplay from '@/components/qr-code-display'

interface Player {
  id: string
  nickname: string
  score: number
  last_answer?: number
  answer_time?: number
  is_correct?: boolean
}

interface Question {
  id: string
  text: string
  type: 'multiple_choice' | 'true_false'
  options: string[]
  correct_answer: number
  time_limit: number
}

interface SessionState {
  id: string
  code: string
  quiz_title: string
  status: 'waiting' | 'active' | 'paused' | 'finished'
  current_question_index: number
  questions: Question[]
  players: Player[]
  time_remaining: number
  responses: { [key: string]: number }
}

export default function SessionControlPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [loading, setLoading] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    loadSessionState()
    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [sessionId])

  const loadSessionState = async () => {
    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`)
      const data = await response.json()
      setSessionState(data.session)
    } catch (error) {
      console.error('Failed to load session:', error)
    }
  }

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/ws/admin/${sessionId}`
    
    wsRef.current = new WebSocket(wsUrl)

    wsRef.current.onopen = () => {
      console.log('Connected to admin session')
    }

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleWebSocketMessage(data)
    }

    wsRef.current.onclose = () => {
      console.log('Disconnected from admin session')
      setTimeout(connectWebSocket, 3000)
    }
  }

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'session_update':
        setSessionState(data.session)
        break
      case 'player_joined':
        setSessionState(prev => prev ? {
          ...prev,
          players: [...prev.players, data.player]
        } : null)
        break
      case 'answer_received':
        setSessionState(prev => prev ? {
          ...prev,
          responses: { ...prev.responses, [data.player_id]: data.answer }
        } : null)
        break
    }
  }

  const startQuiz = async () => {
    setLoading(true)
    try {
      await fetch(`/api/admin/sessions/${sessionId}/start`, { method: 'POST' })
    } catch (error) {
      console.error('Failed to start quiz:', error)
    } finally {
      setLoading(false)
    }
  }

  const nextQuestion = async () => {
    setLoading(true)
    try {
      await fetch(`/api/admin/sessions/${sessionId}/next`, { method: 'POST' })
    } catch (error) {
      console.error('Failed to advance question:', error)
    } finally {
      setLoading(false)
    }
  }

  const pauseQuiz = async () => {
    setLoading(true)
    try {
      await fetch(`/api/admin/sessions/${sessionId}/pause`, { method: 'POST' })
    } catch (error) {
      console.error('Failed to pause quiz:', error)
    } finally {
      setLoading(false)
    }
  }

  const endQuiz = async () => {
    if (!confirm('Are you sure you want to end the quiz?')) return
    
    setLoading(true)
    try {
      await fetch(`/api/admin/sessions/${sessionId}/end`, { method: 'POST' })
    } catch (error) {
      console.error('Failed to end quiz:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!sessionState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading session...</p>
        </div>
      </div>
    )
  }

  const currentQuestion = sessionState.questions[sessionState.current_question_index]
  const totalResponses = Object.keys(sessionState.responses).length
  const responseRate = sessionState.players.length > 0 
    ? Math.round((totalResponses / sessionState.players.length) * 100) 
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-6 py-8">
        {/* Enhanced Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 mb-8 border border-white/20 shadow-2xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{sessionState.quiz_title}</h1>
              <div className="flex flex-wrap items-center gap-4">
                <Badge variant="outline" className="text-lg px-4 py-2 font-mono bg-white/20 text-white border-white/30">
                  {sessionState.code}
                </Badge>
                <Badge className={`text-lg px-4 py-2 ${
                  sessionState.status === 'active' ? 'bg-green-500 hover:bg-green-600' :
                  sessionState.status === 'waiting' ? 'bg-yellow-500 hover:bg-yellow-600' :
                  sessionState.status === 'paused' ? 'bg-orange-500 hover:bg-orange-600' :
                  'bg-gray-500'
                }`}>
                  {sessionState.status.toUpperCase()}
                </Badge>
                <div className="flex items-center gap-2 text-white/80">
                  <Users className="h-5 w-5" />
                  <span className="text-lg font-semibold">{sessionState.players.length} players</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowQR(true)}
                className="border-white/30 text-white hover:bg-white/10 px-6 py-3"
              >
                <QrCode className="h-5 w-5 mr-2" />
                Show QR
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open(`/join?code=${sessionState.code}`, '_blank')}
                className="border-white/30 text-white hover:bg-white/10 px-6 py-3"
              >
                Join Link
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="control" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-sm border border-white/20">
            <TabsTrigger value="control" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Settings className="h-4 w-4 mr-2" />
              Control
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white">
              <Trophy className="h-4 w-4 mr-2" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="players" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" />
              Players
            </TabsTrigger>
          </TabsList>

          {/* Control Tab */}
          <TabsContent value="control" className="space-y-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Quiz Controls */}
              <div className="lg:col-span-2 space-y-8">
                <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-white text-2xl">Quiz Control</CardTitle>
                    <CardDescription className="text-white/70 text-lg">
                      Question {sessionState.current_question_index + 1} of {sessionState.questions.length}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {sessionState.status === 'waiting' && (
                      <Button 
                        onClick={startQuiz} 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 text-xl rounded-xl shadow-lg"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Starting...
                          </>
                        ) : (
                          <>
                            <Play className="h-5 w-5 mr-2" />
                            Start Quiz
                          </>
                        )}
                      </Button>
                    )}

                    {sessionState.status === 'active' && (
                      <div className="flex gap-4">
                        <Button 
                          onClick={pauseQuiz} 
                          disabled={loading}
                          variant="outline"
                          className="flex-1 border-white/30 text-white hover:bg-white/10 py-3 text-lg"
                        >
                          <Pause className="h-5 w-5 mr-2" />
                          Pause
                        </Button>
                        <Button 
                          onClick={nextQuestion} 
                          disabled={loading}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 text-lg"
                        >
                          <SkipForward className="h-5 w-5 mr-2" />
                          Next Question
                        </Button>
                        <Button 
                          onClick={endQuiz} 
                          disabled={loading}
                          variant="destructive"
                          className="px-6 py-3 text-lg"
                        >
                          End Quiz
                        </Button>
                      </div>
                    )}

                    {sessionState.status === 'paused' && (
                      <div className="flex gap-4">
                        <Button 
                          onClick={startQuiz} 
                          disabled={loading}
                          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 text-lg"
                        >
                          <Play className="h-5 w-5 mr-2" />
                          Resume
                        </Button>
                        <Button 
                          onClick={endQuiz} 
                          disabled={loading}
                          variant="destructive"
                          className="px-6 py-3 text-lg"
                        >
                          End Quiz
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Current Question */}
                {currentQuestion && (
                  <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-white text-2xl">Current Question</CardTitle>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                          {currentQuestion.type === 'multiple_choice' ? 'Multiple Choice' : 'True/False'}
                        </Badge>
                        <div className="flex items-center gap-2 text-white/80">
                          <Clock className="h-4 w-4" />
                          <span>{sessionState.time_remaining}s remaining</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                        <p className="text-xl font-medium text-white leading-relaxed">{currentQuestion.text}</p>
                      </div>
                      
                      <div className="grid gap-3">
                        {currentQuestion.options.map((option, index) => (
                          <div 
                            key={index}
                            className={`p-4 rounded-lg border transition-all ${
                              index === currentQuestion.correct_answer 
                                ? 'bg-green-500/20 border-green-400/50 shadow-lg' 
                                : 'bg-white/5 border-white/20'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                                  {String.fromCharCode(65 + index)}
                                </div>
                                <span className="text-white">{option}</span>
                              </div>
                              {index === currentQuestion.correct_answer && (
                                <Badge className="bg-green-600 text-white">Correct</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Response Progress */}
                      <div className="space-y-3">
                        <div className="flex justify-between text-white">
                          <span>Responses: {totalResponses}/{sessionState.players.length}</span>
                          <span>{responseRate}%</span>
                        </div>
                        <Progress value={responseRate} className="h-3 bg-white/20" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Live Response Analytics */}
                {currentQuestion && Object.keys(sessionState.responses).length > 0 && (
                  <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-white text-2xl">Live Responses</CardTitle>
                      <CardDescription className="text-white/70">
                        Real-time answer distribution
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {currentQuestion.options.map((option, index) => {
                          const count = Object.values(sessionState.responses).filter(r => r === index).length
                          const percentage = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0
                          
                          return (
                            <div key={index} className="space-y-2">
                              <div className="flex justify-between text-white">
                                <span className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                                    {String.fromCharCode(65 + index)}
                                  </div>
                                  {option}
                                </span>
                                <span className="font-bold">{count} ({percentage}%)</span>
                              </div>
                              <Progress value={percentage} className="h-2 bg-white/20" />
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Session Stats Sidebar */}
              <div className="space-y-6">
                <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-white text-xl">Session Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-3xl font-bold text-blue-400">{sessionState.players.length}</div>
                        <div className="text-white/70 text-sm">Players</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-3xl font-bold text-green-400">{totalResponses}</div>
                        <div className="text-white/70 text-sm">Responses</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-3xl font-bold text-purple-400">{sessionState.current_question_index + 1}</div>
                        <div className="text-white/70 text-sm">Question</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-3xl font-bold text-orange-400">{responseRate}%</div>
                        <div className="text-white/70 text-sm">Response Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-white text-xl">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full border-white/30 text-white hover:bg-white/10"
                      onClick={() => setShowQR(true)}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Show QR Code
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-white/30 text-white hover:bg-white/10"
                      onClick={() => window.open(`/join?code=${sessionState.code}`, '_blank')}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Open Join Page
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 backdrop-blur-sm border-blue-400/30">
                <CardContent className="p-6 text-center">
                  <Target className="h-12 w-12 text-blue-400 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white">{responseRate}%</div>
                  <div className="text-blue-200">Avg Response Rate</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 backdrop-blur-sm border-green-400/30">
                <CardContent className="p-6 text-center">
                  <Zap className="h-12 w-12 text-green-400 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white">2.3s</div>
                  <div className="text-green-200">Avg Response Time</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border-purple-400/30">
                <CardContent className="p-6 text-center">
                  <Trophy className="h-12 w-12 text-purple-400 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white">78%</div>
                  <div className="text-purple-200">Correct Rate</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-orange-600/20 to-red-600/20 backdrop-blur-sm border-orange-400/30">
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 text-orange-400 mx-auto mb-3" />
                  <div className="text-3xl font-bold text-white">{sessionState.players.length}</div>
                  <div className="text-orange-200">Active Players</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white text-2xl flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-yellow-400" />
                  Live Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sessionState.players
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 10)
                    .map((player, index) => (
                      <div key={player.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-lg ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' :
                            index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white' :
                            index === 2 ? 'bg-gradient-to-r from-orange-600 to-red-500 text-white' :
                            'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                          }`}>
                            {index === 0 ? <Crown className="h-6 w-6" /> : index + 1}
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-white">{player.nickname}</h4>
                            <p className="text-white/60 text-sm">Player #{player.id.slice(-4)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">{player.score}</div>
                          <div className="text-white/60 text-sm">points</div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Players Tab */}
          <TabsContent value="players" className="space-y-6">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white text-2xl">Connected Players</CardTitle>
                <CardDescription className="text-white/70">
                  {sessionState.players.length} players currently connected
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {sessionState.players.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {player.nickname.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-white font-semibold">{player.nickname}</h4>
                          <p className="text-white/60 text-sm">Score: {player.score}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-400 text-sm">Online</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <QRCodeDisplay
          code={sessionState.code}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  )
}
