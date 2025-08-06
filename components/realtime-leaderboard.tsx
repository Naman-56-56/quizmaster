'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Trophy, Crown, Star, Zap, TrendingUp, Users, Target, Clock } from 'lucide-react'

interface Player {
  id: string
  nickname: string
  score: number
  rank: number
  is_online: boolean
  last_answer?: number
  is_correct?: boolean
  answer_time?: number
  trend?: 'up' | 'down' | 'same'
  previous_rank?: number
}

interface LeaderboardProps {
  sessionId: string
  currentPlayerId?: string
  maxPlayers?: number
  showTrends?: boolean
  showStats?: boolean
  updateInterval?: number
}

export default function RealtimeLeaderboard({ 
  sessionId, 
  currentPlayerId, 
  maxPlayers = 20,
  showTrends = true,
  showStats = true,
  updateInterval = 1000
}: LeaderboardProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [stats, setStats] = useState({
    total_players: 0,
    average_score: 0,
    highest_score: 0,
    response_rate: 0,
    active_players: 0
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now())

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(`/api/leaderboard/${sessionId}`)
        const data = await response.json()
        
        if (data.leaderboard) {
          // Calculate trends
          const newPlayers = data.leaderboard.slice(0, maxPlayers).map((player: Player) => {
            const oldPlayer = players.find(p => p.id === player.id)
            let trend: 'up' | 'down' | 'same' = 'same'
            
            if (oldPlayer && showTrends) {
              if (player.rank < oldPlayer.rank) trend = 'up'
              else if (player.rank > oldPlayer.rank) trend = 'down'
            }
            
            return {
              ...player,
              trend,
              previous_rank: oldPlayer?.rank
            }
          })
          
          setPlayers(newPlayers)
          setStats(data.stats || stats)
          setLastUpdate(Date.now())
        }
        setLoading(false)
      } catch (error) {
        console.error('Error fetching leaderboard:', error)
        setLoading(false)
      }
    }

    // Initial fetch
    fetchLeaderboard()

    // Set up polling
    const interval = setInterval(fetchLeaderboard, updateInterval)

    return () => clearInterval(interval)
  }, [sessionId, maxPlayers, updateInterval])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-6 w-6 text-yellow-400" />
      case 2: return <Trophy className="h-6 w-6 text-gray-400" />
      case 3: return <Star className="h-6 w-6 text-orange-500" />
      default: return <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">{rank}</div>
    }
  }

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-500 to-orange-500'
      case 2: return 'bg-gradient-to-r from-gray-400 to-gray-500'
      case 3: return 'bg-gradient-to-r from-orange-600 to-red-500'
      default: return 'bg-gradient-to-r from-blue-500 to-purple-500'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-400" />
      case 'down': return <TrendingUp className="h-4 w-4 text-red-400 rotate-180" />
      default: return null
    }
  }

  if (loading) {
    return (
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="ml-3 text-white">Loading leaderboard...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 backdrop-blur-sm border-blue-400/30">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.total_players}</div>
              <div className="text-blue-200 text-sm">Total Players</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 backdrop-blur-sm border-green-400/30">
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.average_score}</div>
              <div className="text-green-200 text-sm">Avg Score</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border-purple-400/30">
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.highest_score}</div>
              <div className="text-purple-200 text-sm">High Score</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-orange-600/20 to-red-600/20 backdrop-blur-sm border-orange-400/30">
            <CardContent className="p-4 text-center">
              <Zap className="h-8 w-8 text-orange-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.response_rate}%</div>
              <div className="text-orange-200 text-sm">Response Rate</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Live Leaderboard */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl text-white flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-400" />
              Live Leaderboard
            </CardTitle>
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
              <Clock className="h-4 w-4 ml-2" />
              <span>{Math.round((Date.now() - lastUpdate) / 1000)}s ago</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-y-auto">
          {players.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-4 rounded-xl transition-all duration-500 transform hover:scale-102 ${
                player.id === currentPlayerId
                  ? 'bg-gradient-to-r from-blue-600/30 to-purple-600/30 border-2 border-blue-400/50 shadow-lg scale-105'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10'
              } ${
                player.trend === 'up' ? 'animate-pulse' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Rank with trend */}
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${getRankBadgeColor(player.rank)}`}>
                    {player.rank <= 3 ? getRankIcon(player.rank) : (
                      <span className="text-white font-bold">{player.rank}</span>
                    )}
                  </div>
                  {showTrends && player.trend && player.trend !== 'same' && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                      {getTrendIcon(player.trend)}
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold text-white">{player.nickname}</h4>
                    {player.id === currentPlayerId && (
                      <Badge className="bg-blue-600 text-white text-xs">You</Badge>
                    )}
                    {!player.is_online && (
                      <Badge variant="outline" className="text-gray-400 border-gray-400 text-xs">Offline</Badge>
                    )}
                  </div>
                  
                  {/* Answer Status */}
                  {player.last_answer !== undefined && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        player.is_correct ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                      <span className="text-white/70 text-sm">
                        {player.is_correct ? 'Correct' : 'Incorrect'}
                        {player.answer_time && ` • ${player.answer_time.toFixed(1)}s`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{player.score.toLocaleString()}</div>
                  <div className="text-white/70 text-sm">points</div>
                  {showTrends && player.previous_rank && player.previous_rank !== player.rank && (
                    <div className="text-xs text-white/50">
                      was #{player.previous_rank}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {players.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-white/30 mx-auto mb-4" />
              <p className="text-white/70 text-lg">No players yet</p>
              <p className="text-white/50">Waiting for players to join...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Show more indicator */}
      {stats.total_players > maxPlayers && (
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-white/70">
              Showing top {maxPlayers} of {stats.total_players} players
            </p>
            <Progress 
              value={(maxPlayers / stats.total_players) * 100} 
              className="mt-2 h-2 bg-white/20"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
