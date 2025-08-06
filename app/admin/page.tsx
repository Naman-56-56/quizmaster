'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2, Play, Users, QrCode, Settings, Clock, BookOpen, Trophy, Eye } from 'lucide-react'
import Link from 'next/link'

interface Question {
  id: string
  text: string
  type: 'multiple_choice' | 'true_false'
  options: string[]
  correct_answer: number
  time_limit: number
  points: number
}

interface Quiz {
  id: string
  title: string
  description: string
  questions: Question[]
  created_at: string
  settings: {
    time_per_question: number
    randomize_questions: boolean
    show_correct_answer: boolean
    allow_review: boolean
  }
}

interface Session {
  id: string
  quiz_id: string
  quiz_title: string
  code: string
  status: 'waiting' | 'active' | 'finished'
  participants: number
  created_at: string
}

export default function AdminPanel() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [newQuiz, setNewQuiz] = useState<Partial<Quiz>>({
    title: '',
    description: '',
    questions: [],
    settings: {
      time_per_question: 30,
      randomize_questions: false,
      show_correct_answer: true,
      allow_review: false
    }
  })
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    text: '',
    type: 'multiple_choice',
    options: ['', '', '', ''],
    correct_answer: 0,
    time_limit: 30,
    points: 100
  })

  useEffect(() => {
    loadQuizzes()
    loadSessions()
  }, [])

  const loadQuizzes = async () => {
    try {
      const response = await fetch('/api/admin/quizzes')
      const data = await response.json()
      setQuizzes(data.quizzes || [])
    } catch (error) {
      console.error('Failed to load quizzes:', error)
    }
  }

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/admin/sessions')
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  const createQuiz = async () => {
    if (!newQuiz.title || !newQuiz.questions?.length) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuiz)
      })
      
      if (response.ok) {
        setNewQuiz({ 
          title: '', 
          description: '', 
          questions: [],
          settings: {
            time_per_question: 30,
            randomize_questions: false,
            show_correct_answer: true,
            allow_review: false
          }
        })
        loadQuizzes()
      }
    } catch (error) {
      console.error('Failed to create quiz:', error)
    } finally {
      setLoading(false)
    }
  }

  const addQuestion = () => {
    if (!newQuestion.text) return

    const question: Question = {
      id: Date.now().toString(),
      text: newQuestion.text!,
      type: newQuestion.type!,
      options: newQuestion.type === 'true_false' ? ['True', 'False'] : newQuestion.options!,
      correct_answer: newQuestion.correct_answer!,
      time_limit: newQuestion.time_limit!,
      points: newQuestion.points!
    }

    setNewQuiz(prev => ({
      ...prev,
      questions: [...(prev.questions || []), question]
    }))

    setNewQuestion({
      text: '',
      type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: 0,
      time_limit: 30,
      points: 100
    })
  }

  const startSession = async (quizId: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: quizId })
      })
      
      if (response.ok) {
        const data = await response.json()
        loadSessions()
        window.open(`/admin/session/${data.session.id}`, '_blank')
      }
    } catch (error) {
      console.error('Failed to start session:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportQuizJSON = (quiz: Quiz) => {
    const dataStr = JSON.stringify(quiz, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `${quiz.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Quiz Admin Panel
            </h1>
            <p className="text-slate-600 mt-2">Create, manage, and host interactive quizzes</p>
          </div>
          <div className="flex gap-3">
            <Link href="/">
              <Button variant="outline" className="border-slate-300">
                <BookOpen className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Trophy className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <Tabs defaultValue="quizzes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm">
            <TabsTrigger value="quizzes" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <BookOpen className="h-4 w-4 mr-2" />
              My Quizzes
            </TabsTrigger>
            <TabsTrigger value="sessions" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" />
              Live Sessions
            </TabsTrigger>
            <TabsTrigger value="create" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Quiz
            </TabsTrigger>
          </TabsList>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold text-slate-800">Your Quizzes</h2>
                <p className="text-slate-600">Manage your quiz collection</p>
              </div>
              <Button 
                onClick={() => document.querySelector('[value="create"]')?.click()}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Quiz
              </Button>
            </div>

            <div className="grid gap-6">
              {quizzes.map((quiz) => (
                <Card key={quiz.id} className="hover:shadow-lg transition-shadow border-0 shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <CardTitle className="text-xl text-slate-800">{quiz.title}</CardTitle>
                        <CardDescription className="text-slate-600">{quiz.description}</CardDescription>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            <BookOpen className="h-3 w-3 mr-1" />
                            {quiz.questions.length} questions
                          </Badge>
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            <Clock className="h-3 w-3 mr-1" />
                            {quiz.settings.time_per_question}s per question
                          </Badge>
                          {quiz.settings.randomize_questions && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                              Randomized
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        Created {new Date(quiz.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        onClick={() => startSession(quiz.id)}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Session
                      </Button>
                      <Button variant="outline" onClick={() => exportQuizJSON(quiz)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Export JSON
                      </Button>
                      <Button variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">Live Sessions</h2>
              <p className="text-slate-600">Monitor and control active quiz sessions</p>
            </div>

            <div className="grid gap-6">
              {sessions.map((session) => (
                <Card key={session.id} className="hover:shadow-lg transition-shadow border-0 shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <CardTitle className="text-xl text-slate-800">{session.quiz_title}</CardTitle>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                            {session.code}
                          </Badge>
                          <Badge 
                            variant={session.status === 'active' ? 'default' : 'secondary'}
                            className={
                              session.status === 'active' 
                                ? 'bg-green-500 hover:bg-green-600' 
                                : session.status === 'waiting'
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : 'bg-gray-500'
                            }
                          >
                            {session.status.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            <Users className="h-3 w-3 mr-1" />
                            {session.participants} players
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        Started {new Date(session.created_at).toLocaleString()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-2 flex-wrap">
                      <Link href={`/admin/session/${session.id}`}>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                          <Settings className="h-4 w-4 mr-2" />
                          Control Session
                        </Button>
                      </Link>
                      <Button variant="outline">
                        <QrCode className="h-4 w-4 mr-2" />
                        Show QR Code
                      </Button>
                      <Button variant="outline" onClick={() => window.open(`/join?code=${session.code}`, '_blank')}>
                        <Users className="h-4 w-4 mr-2" />
                        Join Link
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Enhanced Create Quiz Tab */}
          <TabsContent value="create" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">Create New Quiz</h2>
              <p className="text-slate-600">Build an interactive quiz with custom questions</p>
            </div>

            {/* Quiz Settings */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                <CardTitle className="text-slate-800">Quiz Settings</CardTitle>
                <CardDescription>Configure your quiz properties</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-slate-700 font-medium">Quiz Title *</Label>
                    <Input
                      id="title"
                      value={newQuiz.title || ''}
                      onChange={(e) => setNewQuiz(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter an engaging quiz title"
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time" className="text-slate-700 font-medium">Default Time per Question</Label>
                    <Select
                      value={newQuiz.settings?.time_per_question?.toString()}
                      onValueChange={(value) => setNewQuiz(prev => ({
                        ...prev,
                        settings: { ...prev.settings!, time_per_question: parseInt(value) }
                      }))}
                    >
                      <SelectTrigger className="border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="45">45 seconds</SelectItem>
                        <SelectItem value="60">60 seconds</SelectItem>
                        <SelectItem value="90">90 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-700 font-medium">Description</Label>
                  <Textarea
                    id="description"
                    value={newQuiz.description || ''}
                    onChange={(e) => setNewQuiz(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this quiz is about"
                    className="border-slate-300"
                    rows={3}
                  />
                </div>

                {/* Advanced Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-700">Advanced Settings</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <Label className="text-slate-700 font-medium">Randomize Questions</Label>
                        <p className="text-sm text-slate-500">Shuffle question order for each player</p>
                      </div>
                      <Switch
                        checked={newQuiz.settings?.randomize_questions}
                        onCheckedChange={(checked) => setNewQuiz(prev => ({
                          ...prev,
                          settings: { ...prev.settings!, randomize_questions: checked }
                        }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <Label className="text-slate-700 font-medium">Show Correct Answers</Label>
                        <p className="text-sm text-slate-500">Display correct answers after each question</p>
                      </div>
                      <Switch
                        checked={newQuiz.settings?.show_correct_answer}
                        onCheckedChange={(checked) => setNewQuiz(prev => ({
                          ...prev,
                          settings: { ...prev.settings!, show_correct_answer: checked }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Question Builder */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardTitle className="text-slate-800">Add Question</CardTitle>
                <CardDescription>Create engaging questions for your quiz</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="question" className="text-slate-700 font-medium">Question Text *</Label>
                  <Textarea
                    id="question"
                    value={newQuestion.text || ''}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Enter your question here..."
                    className="border-slate-300"
                    rows={3}
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Question Type</Label>
                    <Select
                      value={newQuestion.type}
                      onValueChange={(value: 'multiple_choice' | 'true_false') => 
                        setNewQuestion(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger className="border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="true_false">True/False</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Time Limit</Label>
                    <Select
                      value={newQuestion.time_limit?.toString()}
                      onValueChange={(value) => setNewQuestion(prev => ({ ...prev, time_limit: parseInt(value) }))}
                    >
                      <SelectTrigger className="border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="45">45 seconds</SelectItem>
                        <SelectItem value="60">60 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Points</Label>
                    <Input
                      type="number"
                      value={newQuestion.points || 100}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                      className="border-slate-300"
                      min="10"
                      max="1000"
                      step="10"
                    />
                  </div>
                </div>

                {newQuestion.type === 'multiple_choice' && (
                  <div className="space-y-3">
                    <Label className="text-slate-700 font-medium">Answer Options</Label>
                    {newQuestion.options?.map((option, index) => (
                      <div key={index} className="flex gap-3 items-center">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <Input
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...(newQuestion.options || [])]
                            newOptions[index] = e.target.value
                            setNewQuestion(prev => ({ ...prev, options: newOptions }))
                          }}
                          placeholder={`Option ${index + 1}`}
                          className="flex-1 border-slate-300"
                        />
                        <Button
                          type="button"
                          variant={newQuestion.correct_answer === index ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setNewQuestion(prev => ({ ...prev, correct_answer: index }))}
                          className={newQuestion.correct_answer === index ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                          {newQuestion.correct_answer === index ? '✓ Correct' : 'Mark Correct'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {newQuestion.type === 'true_false' && (
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium">Correct Answer</Label>
                    <Select
                      value={newQuestion.correct_answer?.toString()}
                      onValueChange={(value) => setNewQuestion(prev => ({ ...prev, correct_answer: parseInt(value) }))}
                    >
                      <SelectTrigger className="border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">True</SelectItem>
                        <SelectItem value="1">False</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button 
                  onClick={addQuestion}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                  disabled={!newQuestion.text}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </CardContent>
            </Card>

            {/* Questions Preview */}
            {newQuiz.questions && newQuiz.questions.length > 0 && (
              <Card className="border-0 shadow-md">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <CardTitle className="text-slate-800">
                    Questions Preview ({newQuiz.questions.length})
                  </CardTitle>
                  <CardDescription>Review your questions before creating the quiz</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {newQuiz.questions.map((question, index) => (
                      <div key={question.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <h4 className="font-medium text-slate-800">Question {index + 1}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {question.type === 'multiple_choice' ? 'Multiple Choice' : 'True/False'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {question.time_limit}s
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {question.points} pts
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setNewQuiz(prev => ({
                                  ...prev,
                                  questions: prev.questions?.filter(q => q.id !== question.id)
                                }))
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-slate-700 mb-3">{question.text}</p>
                        <div className="grid gap-2">
                          {question.options.map((option, optIndex) => (
                            <div 
                              key={optIndex}
                              className={`p-2 rounded text-sm ${
                                optIndex === question.correct_answer 
                                  ? 'bg-green-100 text-green-800 border border-green-200' 
                                  : 'bg-white text-slate-600 border border-slate-200'
                              }`}
                            >
                              <span className="font-medium mr-2">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              {option}
                              {optIndex === question.correct_answer && (
                                <Badge className="ml-2 bg-green-600 text-xs">Correct</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <Button 
                      onClick={createQuiz} 
                      disabled={loading || !newQuiz.title || !newQuiz.questions.length}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 py-3 text-lg"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating Quiz...
                        </>
                      ) : (
                        <>
                          <Trophy className="h-5 w-5 mr-2" />
                          Create Quiz & Save JSON
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
