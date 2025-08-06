import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const SESSIONS_DIR = join(process.cwd(), 'data', 'sessions')

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionPath = join(SESSIONS_DIR, `${params.sessionId}.json`)
    const content = await readFile(sessionPath, 'utf-8')
    const session = JSON.parse(content)
    
    if (session.players.length === 0) {
      return NextResponse.json({ error: 'No players have joined yet' }, { status: 400 })
    }
    
    session.status = 'active'
    session.current_question_index = 0
    session.started_at = new Date().toISOString()
    session.question_start_time = Date.now()
    session.responses = {}
    
    // Initialize player stats
    session.players.forEach((player: any) => {
      player.score = 0
      player.rank = 1
      player.answers = []
      player.is_online = true
    })
    
    await writeFile(sessionPath, JSON.stringify(session, null, 2))
    
    // The WebSocket handler will broadcast the game start
    
    return NextResponse.json({ 
      success: true, 
      session,
      message: `Game started with ${session.players.length} players`
    })
  } catch (error) {
    console.error('Error starting session:', error)
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 })
  }
}
