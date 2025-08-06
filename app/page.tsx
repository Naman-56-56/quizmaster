'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Users, Trophy, Zap, QrCode, Play, Plus, Star, Clock, Target, Sparkles, ArrowRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const [gameCode, setGameCode] = useState('')
  const [stats, setStats] = useState({
    totalQuizzes: 1247,
    activeUsers: 8934,
    questionsAnswered: 156789
  })

  useEffect(() => {
    // Animate stats on load
    const interval = setInterval(() => {
      setStats(prev => ({
        totalQuizzes: prev.totalQuizzes + Math.floor(Math.random() * 3),
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 5),
        questionsAnswered: prev.questionsAnswered + Math.floor(Math.random() * 10)
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const handleJoinGame = () => {
    if (gameCode.length === 6) {
      window.location.href = `/join?code=${gameCode}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 p-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">QuizMaster</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/admin">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                Admin Panel
              </Button>
            </Link>
            <Button className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30">
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/80 text-sm mb-6 border border-white/20">
            <Star className="h-4 w-4 mr-2 text-yellow-400" />
            Trusted by 50,000+ educators worldwide
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Interactive Quiz
            <span className="bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-clip-text text-transparent block">
              Experiences
            </span>
          </h1>
          
          <p className="text-xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
            Create engaging quizzes, host live sessions, and connect with up to 200+ participants in real-time. 
            Perfect for classrooms, corporate training, and fun gatherings.
          </p>

          {/* Quick Join Section */}
          <div className="max-w-md mx-auto mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h3 className="text-white font-semibold mb-4 flex items-center justify-center">
                <QrCode className="h-5 w-5 mr-2" />
                Quick Join
              </h3>
              <div className="flex gap-3">
                <Input
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  placeholder="Enter game code"
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/60 text-center font-mono text-lg"
                  maxLength={6}
                />
                <Button 
                  onClick={handleJoinGame}
                  disabled={gameCode.length !== 6}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/admin">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-200">
                <Plus className="h-5 w-5 mr-2" />
                Create Quiz
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link href="/join">
              <Button size="lg" variant="outline" className="border-2 border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg rounded-xl backdrop-blur-sm">
                <Users className="h-5 w-5 mr-2" />
                Join Session
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/15 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Massive Scale</CardTitle>
              <CardDescription className="text-white/70 text-base">
                Support up to 200+ simultaneous participants with real-time synchronization
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-400 mr-1" />
                  Real-time sync
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-400 mr-1" />
                  No lag
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/15 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <QrCode className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Easy Access</CardTitle>
              <CardDescription className="text-white/70 text-base">
                QR codes and short codes make joining sessions instant and effortless
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-400 mr-1" />
                  QR codes
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-400 mr-1" />
                  Mobile ready
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/15 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Lightning Fast</CardTitle>
              <CardDescription className="text-white/70 text-base">
                Sub-second response times with live leaderboards and instant feedback
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-400 mr-1" />
                  {'<1s response'}
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-400 mr-1" />
                  Live updates
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 mb-16 border border-white/10">
          <h2 className="text-3xl font-bold text-white text-center mb-8">Trusted Worldwide</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text mb-2">
                {stats.totalQuizzes.toLocaleString()}+
              </div>
              <div className="text-white/70">Quizzes Created</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text mb-2">
                {stats.activeUsers.toLocaleString()}+
              </div>
              <div className="text-white/70">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-transparent bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text mb-2">
                {stats.questionsAnswered.toLocaleString()}+
              </div>
              <div className="text-white/70">Questions Answered</div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 hover:bg-white/15 transition-all duration-300">
            <Clock className="h-8 w-8 text-blue-400 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-2">Real-time</h3>
            <p className="text-white/70 text-sm">Live synchronization with all participants</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 hover:bg-white/15 transition-all duration-300">
            <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-2">Leaderboards</h3>
            <p className="text-white/70 text-sm">Live scoring and competitive rankings</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 hover:bg-white/15 transition-all duration-300">
            <Target className="h-8 w-8 text-green-400 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-2">Analytics</h3>
            <p className="text-white/70 text-sm">Detailed performance insights</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 hover:bg-white/15 transition-all duration-300">
            <Sparkles className="h-8 w-8 text-purple-400 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-2">Customizable</h3>
            <p className="text-white/70 text-sm">Flexible quiz formats and settings</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-3xl p-12 border border-white/20">
            <h2 className="text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of educators and trainers who are already creating amazing quiz experiences.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/admin">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg rounded-xl shadow-2xl">
                  Start Creating
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-2 border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg rounded-xl backdrop-blur-sm">
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
