import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, readdir } from 'fs/promises'
import { join } from 'path'

const SESSIONS_DIR = join(process.cwd(), 'data', 'sessions')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, nickname } = body
    
    if (!code || !nickname) {
      return NextResponse.json({ error: 'Code and nickname are required' }, { status: 400 })
    }

    // Find session by code
    const files = await readdir(SESSIONS_DIR)
    const sessionFiles = files.filter(file => file.endsWith('.json'))
    
    let targetSession = null
    let sessionPath = ''
    
    for (const file of sessionFiles) {
      const filePath = join(SESSIONS_DIR, file)
      const content = await readFile(filePath, 'utf-8')
      const session = JSON.parse(content)
      
      if (session.code === code.toUpperCase() && session.status !== 'finished') {
        targetSession = session
        sessionPath = filePath
        break
      }
    }
    
    if (!targetSession) {
      return NextResponse.json({ error: 'Game not found or has ended' }, { status: 404 })
    }

    // Check player limit (200+ support)
    if (targetSession.players.length >= 250) {
      return NextResponse.json({ error: 'Game is full (maximum 250 players)' }, { status: 400 })
    }
    
    // Check if nickname is already taken
    const existingPlayer = targetSession.players.find((p: any) => p.nickname.toLowerCase() === nickname.toLowerCase())
    if (existingPlayer) {
      return NextResponse.json({ error: 'Nickname already taken' }, { status: 400 })
    }
    
    // Create new player
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const player = {
      id: playerId,
      nickname: nickname.trim(),
      score: 0,
      rank: targetSession.players.length + 1,
      session_id: targetSession.id,
      joined_at: new Date().toISOString(),
      answers: [],
      is_online: true,
      last_seen: new Date().toISOString()
    }
    
    targetSession.players.push(player)
    targetSession.participants = targetSession.players.length
    targetSession.updated_at = new Date().toISOString()
    
    // Save updated session
    await writeFile(sessionPath, JSON.stringify(targetSession, null, 2))
    
    // Broadcast player joined to all connections
    // This would be handled by the WebSocket server
    
    return NextResponse.json({
      success: true,
      player_id: player.id,
      session_id: targetSession.id,
      player: {
        id: player.id,
        nickname: player.nickname,
        score: player.score,
        rank: player.rank
      },
      session: {
        id: targetSession.id,
        title: targetSession.quiz_title,
        status: targetSession.status,
        current_question: targetSession.current_question_index + 1,
        total_questions: targetSession.questions.length,
        players_count: targetSession.players.length
      }
    })
  } catch (error) {
    console.error('Error joining game:', error)
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 })
  }
}
