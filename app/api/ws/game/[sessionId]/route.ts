import { NextRequest } from 'next/server'
import { WebSocketServer } from 'ws'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const SESSIONS_DIR = join(process.cwd(), 'data', 'sessions')

// Global WebSocket connections store
const gameConnections = new Map<string, Set<any>>()
const playerConnections = new Map<string, any>()

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { searchParams } = new URL(request.url)
  const upgrade = request.headers.get('upgrade')

  if (upgrade !== 'websocket') {
    return new Response('Expected websocket', { status: 426 })
  }

  // This would be handled by the WebSocket server in a real implementation
  return new Response('WebSocket endpoint', { status: 200 })
}

// WebSocket message handlers
export const handleWebSocketConnection = async (ws: any, sessionId: string, playerId?: string) => {
  // Add connection to session
  if (!gameConnections.has(sessionId)) {
    gameConnections.set(sessionId, new Set())
  }
  gameConnections.get(sessionId)!.add(ws)

  if (playerId) {
    playerConnections.set(playerId, ws)
  }

  // Load session state
  const sessionPath = join(SESSIONS_DIR, `${sessionId}.json`)
  let sessionState
  try {
    const content = await readFile(sessionPath, 'utf-8')
    sessionState = JSON.parse(content)
  } catch (error) {
    ws.close()
    return
  }

  // Send initial state
  ws.send(JSON.stringify({
    type: 'game_state',
    state: sessionState
  }))

  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message)
      await handleMessage(ws, sessionId, data)
    } catch (error) {
      console.error('WebSocket message error:', error)
    }
  })

  ws.on('close', () => {
    gameConnections.get(sessionId)?.delete(ws)
    if (playerId) {
      playerConnections.delete(playerId)
    }
  })
}

const handleMessage = async (ws: any, sessionId: string, data: any) => {
  const sessionPath = join(SESSIONS_DIR, `${sessionId}.json`)
  
  switch (data.type) {
    case 'join':
      await handlePlayerJoin(sessionId, data.player_id)
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

const handlePlayerJoin = async (sessionId: string, playerId: string) => {
  // Broadcast player joined
  broadcastToSession(sessionId, {
    type: 'player_joined',
    player_id: playerId
  })
}

const handlePlayerAnswer = async (sessionId: string, data: any) => {
  const sessionPath = join(SESSIONS_DIR, `${sessionId}.json`)
  
  try {
    const content = await readFile(sessionPath, 'utf-8')
    const session = JSON.parse(content)
    
    // Record answer
    if (!session.responses) session.responses = {}
    session.responses[data.player_id] = {
      answer: data.answer,
      timestamp: data.timestamp,
      time_taken: (data.timestamp - session.question_start_time) / 1000
    }

    // Calculate score
    const currentQuestion = session.questions[session.current_question_index]
    const isCorrect = data.answer === currentQuestion.correct_answer
    const timeTaken = (data.timestamp - session.question_start_time) / 1000
    
    let points = 0
    if (isCorrect) {
      // Base points + time bonus (faster = more points)
      const timeBonus = Math.max(0, (currentQuestion.time_limit - timeTaken) / currentQuestion.time_limit)
      points = Math.round(currentQuestion.points * (0.5 + 0.5 * timeBonus))
    }

    // Update player score
    const playerIndex = session.players.findIndex((p: any) => p.id === data.player_id)
    if (playerIndex !== -1) {
      session.players[playerIndex].score += points
      session.players[playerIndex].last_answer = data.answer
      session.players[playerIndex].is_correct = isCorrect
      session.players[playerIndex].answer_time = timeTaken
    }

    // Sort players by score for ranking
    session.players.sort((a: any, b: any) => b.score - a.score)
    session.players.forEach((player: any, index: number) => {
      player.rank = index + 1
    })

    await writeFile(sessionPath, JSON.stringify(session, null, 2))

    // Send answer result to player
    const playerWs = playerConnections.get(data.player_id)
    if (playerWs) {
      playerWs.send(JSON.stringify({
        type: 'answer_result',
        correct: isCorrect,
        points_earned: points,
        total_score: session.players[playerIndex]?.score || 0
      }))
    }

    // Broadcast live leaderboard update
    broadcastToSession(sessionId, {
      type: 'leaderboard_update',
      players: session.players.slice(0, 20), // Top 20 for performance
      total_responses: Object.keys(session.responses).length,
      total_players: session.players.length
    })

    // Broadcast response received to admin
    broadcastToSession(sessionId, {
      type: 'answer_received',
      player_id: data.player_id,
      answer: data.answer,
      is_correct: isCorrect,
      response_count: Object.keys(session.responses).length
    })

  } catch (error) {
    console.error('Error handling answer:', error)
  }
}

const handleStartGame = async (sessionId: string) => {
  const sessionPath = join(SESSIONS_DIR, `${sessionId}.json`)
  
  try {
    const content = await readFile(sessionPath, 'utf-8')
    const session = JSON.parse(content)
    
    session.status = 'active'
    session.current_question_index = 0
    session.question_start_time = Date.now()
    session.responses = {}
    
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

const handleNextQuestion = async (sessionId: string) => {
  const sessionPath = join(SESSIONS_DIR, `${sessionId}.json`)
  
  try {
    const content = await readFile(sessionPath, 'utf-8')
    const session = JSON.parse(content)
    
    session.current_question_index++
    session.question_start_time = Date.now()
    session.responses = {}
    
    if (session.current_question_index >= session.questions.length) {
      // Game finished
      session.status = 'finished'
      await writeFile(sessionPath, JSON.stringify(session, null, 2))
      
      broadcastToSession(sessionId, {
        type: 'game_ended',
        final_leaderboard: session.players.slice(0, 50)
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

const handleEndGame = async (sessionId: string) => {
  const sessionPath = join(SESSIONS_DIR, `${sessionId}.json`)
  
  try {
    const content = await readFile(sessionPath, 'utf-8')
    const session = JSON.parse(content)
    
    session.status = 'finished'
    session.ended_at = new Date().toISOString()
    
    await writeFile(sessionPath, JSON.stringify(session, null, 2))
    
    broadcastToSession(sessionId, {
      type: 'game_ended',
      final_leaderboard: session.players.slice(0, 50)
    })
  } catch (error) {
    console.error('Error ending game:', error)
  }
}

const startQuestionTimer = (sessionId: string, timeLimit: number) => {
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
      
      // Show results for 3 seconds, then auto-advance
      setTimeout(() => {
        handleNextQuestion(sessionId)
      }, 3000)
    }
  }, 1000)
}

const broadcastToSession = (sessionId: string, message: any) => {
  const connections = gameConnections.get(sessionId)
  if (connections) {
    const messageStr = JSON.stringify(message)
    connections.forEach(ws => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(messageStr)
      }
    })
  }
}
