const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { WebSocketServer } = require('ws')
const { readFile, writeFile } = require('fs/promises')
const { join } = require('path')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

const SESSIONS_DIR = join(process.cwd(), 'data', 'sessions')

// Global WebSocket connections store
const gameConnections = new Map()
const playerConnections = new Map()
const sessionTimers = new Map()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Create WebSocket server
  const wss = new WebSocketServer({ server })

  wss.on('connection', (ws, req) => {
    const url = parse(req.url, true)
    const pathParts = url.pathname.split('/')
    
    // Extract session ID from path like /api/ws/game/[sessionId]
    if (pathParts[3] === 'game' && pathParts[4]) {
      const sessionId = pathParts[4]
      handleGameConnection(ws, sessionId)
    } else if (pathParts[3] === 'admin' && pathParts[4]) {
      const sessionId = pathParts[4]
      handleAdminConnection(ws, sessionId)
    }
  })

  const handleGameConnection = async (ws, sessionId) => {
    console.log(`Player connected to session: ${sessionId}`)
    
    // Add connection to session
    if (!gameConnections.has(sessionId)) {
      gameConnections.set(sessionId, new Set())
    }
    gameConnections.get(sessionId).add(ws)

    // Load and send initial session state
    try {
      const sessionPath = join(SESSIONS_DIR, `${sessionId}.json`)
      const content = await readFile(sessionPath, 'utf-8')
      const sessionState = JSON.parse(content)
      
      ws.send(JSON.stringify({
        type: 'game_state',
        state: sessionState
      }))
    } catch (error) {
      console.error('Error loading session:', error)
      ws.close()
      return
    }

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString())
        await handleGameMessage(ws, sessionId, data)
      } catch (error) {
        console.error('WebSocket message error:', error)
      }
    })

    ws.on('close', () => {
      console.log(`Player disconnected from session: ${sessionId}`)
      gameConnections.get(sessionId)?.delete(ws)
      
      // Clean up player connection if it exists
      for (const [playerId, playerWs] of playerConnections.entries()) {
        if (playerWs === ws) {
          playerConnections.delete(playerId)
          break
        }
      }
    })
  }

  const handleAdminConnection = async (ws, sessionId) => {
    console.log(`Admin connected to session: ${sessionId}`)
    
    // Add to game connections for admin updates
    if (!gameConnections.has(sessionId)) {
      gameConnections.set(sessionId, new Set())
    }
    gameConnections.get(sessionId).add(ws)

    ws.on('close', () => {
      console.log(`Admin disconnected from session: ${sessionId}`)
      gameConnections.get(sessionId)?.delete(ws)
    })
  }

  const handleGameMessage = async (ws, sessionId, data) => {
    switch (data.type) {
      case 'join':
        await handlePlayerJoin(sessionId, data.player_id, ws)
        break
      case 'answer':
        await handlePlayerAnswer(sessionId, data)
        break
      case 'start_game':
        await handleStartGame(sessionId)
        break
      case 'next_question':
        await handleNextQuestion(sessionId)
        break
      case 'end_game':
        await handleEndGame(sessionId)
        break
    }
  }

  const handlePlayerJoin = async (sessionId, playerId, ws) => {
    playerConnections.set(playerId, ws)
    
    // Broadcast player joined
    broadcastToSession(sessionId, {
      type: 'player_joined',
      player_id: playerId,
      timestamp: Date.now()
    })
  }

  const handlePlayerAnswer = async (sessionId, data) => {
    const sessionPath = join(SESSIONS_DIR, `${sessionId}.json`)
    
    try {
      const content = await readFile(sessionPath, 'utf-8')
      const session = JSON.parse(content)
      
      // Record answer with detailed timing
      if (!session.responses) session.responses = {}
      const responseTime = (data.timestamp - session.question_start_time) / 1000
      
      session.responses[data.player_id] = {
        answer: data.answer,
        timestamp: data.timestamp,
        response_time: responseTime
      }

      // Calculate score with advanced algorithm
      const currentQuestion = session.questions[session.current_question_index]
      const isCorrect = data.answer === currentQuestion.correct_answer
      const basePoints = currentQuestion.points || 1000
      
      let points = 0
      if (isCorrect) {
        // Time bonus: faster answers get more points (up to 50% bonus)
        const timeBonus = Math.max(0, (currentQuestion.time_limit - responseTime) / currentQuestion.time_limit)
        const timeBonusPoints = Math.round(basePoints * 0.5 * timeBonus)
        
        // Difficulty bonus based on how many got it wrong
        const totalResponses = Object.keys(session.responses).length
        const correctResponses = Object.values(session.responses).filter(r => r.answer === currentQuestion.correct_answer).length
        const difficultyBonus = totalResponses > 5 ? Math.round(basePoints * 0.2 * (1 - correctResponses / totalResponses)) : 0
        
        points = basePoints + timeBonusPoints + difficultyBonus
      }

      // Update player score and stats
      const playerIndex = session.players.findIndex(p => p.id === data.player_id)
      if (playerIndex !== -1) {
        const player = session.players[playerIndex]
        const previousScore = player.score
        
        player.score += points
        player.last_answer = data.answer
        player.is_correct = isCorrect
        player.answer_time = responseTime
        player.last_seen = new Date().toISOString()
        
        // Track answer history
        if (!player.answer_history) player.answer_history = []
        player.answer_history.push({
          question_index: session.current_question_index,
          answer: data.answer,
          is_correct: isCorrect,
          points_earned: points,
          response_time: responseTime,
          timestamp: data.timestamp
        })
        
        // Calculate streak
        const recentAnswers = player.answer_history.slice(-5)
        player.current_streak = 0
        for (let i = recentAnswers.length - 1; i >= 0; i--) {
          if (recentAnswers[i].is_correct) {
            player.current_streak++
          } else {
            break
          }
        }
      }

      // Sort players by score and update ranks
      session.players.sort((a, b) => b.score - a.score)
      session.players.forEach((player, index) => {
        player.previous_rank = player.rank
        player.rank = index + 1
      })

      await writeFile(sessionPath, JSON.stringify(session, null, 2))

      // Send answer result to specific player
      const playerWs = playerConnections.get(data.player_id)
      if (playerWs && playerWs.readyState === 1) {
        playerWs.send(JSON.stringify({
          type: 'answer_result',
          correct: isCorrect,
          points_earned: points,
          total_score: session.players[playerIndex]?.score || 0,
          response_time: responseTime,
          rank: session.players[playerIndex]?.rank,
          previous_rank: session.players[playerIndex]?.previous_rank
        }))
      }

      // Broadcast live leaderboard update to all players
      broadcastToSession(sessionId, {
        type: 'leaderboard_update',
        players: session.players.slice(0, 50), // Top 50 for performance
        total_responses: Object.keys(session.responses).length,
        total_players: session.players.length,
        response_rate: Math.round((Object.keys(session.responses).length / session.players.length) * 100)
      })

      // Broadcast to admin with detailed stats
      broadcastToSession(sessionId, {
        type: 'answer_received',
        player_id: data.player_id,
        answer: data.answer,
        is_correct: isCorrect,
        points_earned: points,
        response_time: responseTime,
        response_count: Object.keys(session.responses).length,
        response_distribution: calculateResponseDistribution(session, currentQuestion)
      })

    } catch (error) {
      console.error('Error handling answer:', error)
    }
  }

  const handleStartGame = async (sessionId) => {
    const sessionPath = join(SESSIONS_DIR, `${sessionId}.json`)
    
    try {
      const content = await readFile(sessionPath, 'utf-8')
      const session = JSON.parse(content)
      
      session.status = 'active'
      session.current_question_index = 0
      session.question_start_time = Date.now()
      session.responses = {}
      session.started_at = new Date().toISOString()
      
      await writeFile(sessionPath, JSON.stringify(session, null, 2))
      
      const currentQuestion = session.questions[0]
      
      // Start question timer
      startQuestionTimer(sessionId, currentQuestion.time_limit)
      
      broadcastToSession(sessionId, {
        type: 'game_started',
        question: {
          id: currentQuestion.id,
          text: currentQuestion.text,
          options: currentQuestion.options,
          time_limit: currentQuestion.time_limit,
          question_number: 1,
          total_questions: session.questions.length
        }
      })
    } catch (error) {
      console.error('Error starting game:', error)
    }
  }

  const handleNextQuestion = async (sessionId) => {
    const sessionPath = join(SESSIONS_DIR, `${sessionId}.json`)
    
    try {
      const content = await readFile(sessionPath, 'utf-8')
      const session = JSON.parse(content)
      
      // Clear previous timer
      if (sessionTimers.has(sessionId)) {
        clearInterval(sessionTimers.get(sessionId))
        sessionTimers.delete(sessionId)
      }
      
      session.current_question_index++
      session.question_start_time = Date.now()
      session.responses = {}
      
      if (session.current_question_index >= session.questions.length) {
        // Game finished
        session.status = 'finished'
        session.ended_at = new Date().toISOString()
        
        await writeFile(sessionPath, JSON.stringify(session, null, 2))
        
        broadcastToSession(sessionId, {
          type: 'game_ended',
          final_leaderboard: session.players.slice(0, 100),
          game_stats: calculateGameStats(session)
        })
        return
      }
      
      await writeFile(sessionPath, JSON.stringify(session, null, 2))
      
      const currentQuestion = session.questions[session.current_question_index]
      
      // Start question timer
      startQuestionTimer(sessionId, currentQuestion.time_limit)
      
      broadcastToSession(sessionId, {
        type: 'new_question',
        question: {
          id: currentQuestion.id,
          text: currentQuestion.text,
          options: currentQuestion.options,
          time_limit: currentQuestion.time_limit,
          question_number: session.current_question_index + 1,
          total_questions: session.questions.length
        }
      })
    } catch (error) {
      console.error('Error advancing question:', error)
    }
  }

  const handleEndGame = async (sessionId) => {
    const sessionPath = join(SESSIONS_DIR, `${sessionId}.json`)
    
    try {
      // Clear timer
      if (sessionTimers.has(sessionId)) {
        clearInterval(sessionTimers.get(sessionId))
        sessionTimers.delete(sessionId)
      }
      
      const content = await readFile(sessionPath, 'utf-8')
      const session = JSON.parse(content)
      
      session.status = 'finished'
      session.ended_at = new Date().toISOString()
      
      await writeFile(sessionPath, JSON.stringify(session, null, 2))
      
      broadcastToSession(sessionId, {
        type: 'game_ended',
        final_leaderboard: session.players.slice(0, 100),
        game_stats: calculateGameStats(session)
      })
    } catch (error) {
      console.error('Error ending game:', error)
    }
  }

  const startQuestionTimer = (sessionId, timeLimit) => {
    let timeRemaining = timeLimit
    
    const timer = setInterval(async () => {
      timeRemaining--
      
      // Broadcast time update every second
      broadcastToSession(sessionId, {
        type: 'time_update',
        time_remaining: timeRemaining
      })
      
      if (timeRemaining <= 0) {
        clearInterval(timer)
        sessionTimers.delete(sessionId)
        
        // Show results for 3 seconds, then auto-advance
        setTimeout(() => {
          handleNextQuestion(sessionId)
        }, 3000)
      }
    }, 1000)
    
    sessionTimers.set(sessionId, timer)
  }

  const broadcastToSession = (sessionId, message) => {
    const connections = gameConnections.get(sessionId)
    if (connections) {
      const messageStr = JSON.stringify(message)
      connections.forEach(ws => {
        if (ws.readyState === 1) { // WebSocket.OPEN
          try {
            ws.send(messageStr)
          } catch (error) {
            console.error('Error sending WebSocket message:', error)
          }
        }
      })
    }
  }

  const calculateResponseDistribution = (session, question) => {
    const responses = session.responses || {}
    const distribution = question.options.map((option, index) => {
      const count = Object.values(responses).filter(r => r.answer === index).length
      const total = Object.keys(responses).length
      return {
        option_index: index,
        option_text: option,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        is_correct: index === question.correct_answer
      }
    })
    return distribution
  }

  const calculateGameStats = (session) => {
    const players = session.players
    const totalQuestions = session.current_question_index + 1
    
    return {
      total_players: players.length,
      questions_completed: totalQuestions,
      total_questions: session.questions.length,
      average_score: players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.score, 0) / players.length) : 0,
      highest_score: players.length > 0 ? Math.max(...players.map(p => p.score)) : 0,
      completion_rate: Math.round((totalQuestions / session.questions.length) * 100),
      duration_minutes: session.started_at ? Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000) : 0,
      top_performers: players.slice(0, 10)
    }
  }

  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log('> WebSocket server ready for real-time quiz connections')
  })
})
