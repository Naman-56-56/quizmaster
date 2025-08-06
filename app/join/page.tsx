'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QrCode, Users, Smartphone, Sparkles, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function JoinPage() {
  const [gameCode, setGameCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const router = useRouter()

  useEffect(() => {
    // Check if joining via QR code (URL parameter)
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    if (code) {
      setGameCode(code)
      setStep(2)
    }
  }, [])

  const validateGameCode = () => {
    if (gameCode.length === 6) {
      setStep(2)
      setError('')
    } else {
      setError('Please enter a valid 6-character game code')
    }
  }

  const joinGame = async () => {
    if (!gameCode || !nickname) {
      setError('Please enter both game code and nickname')
      return
    }

    setIsJoining(true)
    setError('')

    try {
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: gameCode.toUpperCase(), 
          nickname: nickname.trim() 
        })
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('player_id', data.player_id)
        localStorage.setItem('session_id', data.session_id)
        localStorage.setItem('player_nickname', nickname.trim())
        router.push(`/play/${data.session_id}`)
      } else {
        setError(data.error || 'Failed to join game')
      }
    } catch (error) {
      setError('Connection error. Please try again.')
    } finally {
      setIsJoining(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (step === 1) {
        validateGameCode()
      } else {
        joinGame()
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-1000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 p-6">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2 text-white hover:text-emerald-200 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">QuizMaster</span>
          </div>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Join Quiz Session
          </h1>
          <p className="text-xl text-white/80">
            Enter your game code and get ready to play!
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= 1 ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white/60'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 rounded ${step >= 2 ? 'bg-emerald-500' : 'bg-white/20'}`}></div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= 2 ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white/60'
              }`}>
                2
              </div>
            </div>
          </div>

          {/* Step 1: Game Code */}
          {step === 1 && (
            <Card className="bg-white/10 backdrop-blur-sm shadow-2xl border-white/20 animate-in slide-in-from-bottom-4 duration-500">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto mb-4 p-4 bg-emerald-500/20 rounded-full w-fit">
                  <QrCode className="h-12 w-12 text-emerald-400" />
                </div>
                <CardTitle className="text-3xl text-white">Enter Game Code</CardTitle>
                <CardDescription className="text-white/70 text-lg">
                  Get the 6-digit code from your quiz host
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="gameCode" className="text-white font-medium">Game Code</Label>
                  <Input
                    id="gameCode"
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                    onKeyPress={handleKeyPress}
                    placeholder="ABC123"
                    className="text-center text-2xl font-mono tracking-wider bg-white/20 border-white/30 text-white placeholder:text-white/50 h-16"
                    maxLength={6}
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-lg flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
                    <p className="text-red-200">{error}</p>
                  </div>
                )}

                <Button 
                  onClick={validateGameCode}
                  disabled={gameCode.length !== 6}
                  className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white py-4 text-lg rounded-xl shadow-lg"
                >
                  Continue
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Nickname */}
          {step === 2 && (
            <Card className="bg-white/10 backdrop-blur-sm shadow-2xl border-white/20 animate-in slide-in-from-right-4 duration-500">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto mb-4 p-4 bg-cyan-500/20 rounded-full w-fit">
                  <Users className="h-12 w-12 text-cyan-400" />
                </div>
                <CardTitle className="text-3xl text-white">Choose Your Nickname</CardTitle>
                <CardDescription className="text-white/70 text-lg">
                  This is how other players will see you
                </CardDescription>
                <div className="mt-4 p-3 bg-emerald-500/20 rounded-lg border border-emerald-400/30">
                  <div className="flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-emerald-400 mr-2" />
                    <span className="text-emerald-200 font-mono text-lg">{gameCode}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="nickname" className="text-white font-medium">Your Nickname</Label>
                  <Input
                    id="nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your name"
                    className="text-center text-xl bg-white/20 border-white/30 text-white placeholder:text-white/50 h-14"
                    maxLength={20}
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-lg flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
                    <p className="text-red-200">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button 
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="flex-1 border-white/30 text-white hover:bg-white/10 py-4 text-lg rounded-xl"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={joinGame} 
                    disabled={isJoining || !nickname.trim()}
                    className="flex-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white py-4 text-lg rounded-xl shadow-lg"
                  >
                    {isJoining ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Joining...
                      </>
                    ) : (
                      'Join Game'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <div className="mt-12 space-y-6">
            <h3 className="text-2xl font-bold text-white text-center mb-6">How to Join</h3>
            <div className="grid gap-4">
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                      <QrCode className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-lg">Scan QR Code</h4>
                      <p className="text-white/70">Use your phone camera to scan the QR code displayed by the host</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                      <Smartphone className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-lg">Mobile Optimized</h4>
                      <p className="text-white/70">Best experience on mobile devices with touch-friendly interface</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-lg">Real-time Play</h4>
                      <p className="text-white/70">Compete with up to 200+ players in real-time quiz sessions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  )
}
