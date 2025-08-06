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
    
    session.status = 'finished'
    session.ended_at = new Date().toISOString()
    session.updated_at = new Date().toISOString()
    
    // Calculate final statistics
    const totalQuestions = session.current_question_index + 1
    const totalPlayers = session.players.length
    
    // Sort players by final score
    session.players.sort((a: any, b: any) => b.score - a.score)
    session.players.forEach((player: any, index: number) => {
      player.final_rank = index + 1
    })
    
    // Calculate game statistics
    const gameStats = {
      total_players: totalPlayers,
      questions_completed: totalQuestions,
      total_questions: session.questions.length,
      average_score: totalPlayers > 0 ? Math.round(session.players.reduce((sum: number, p: any) => sum + p.score, 0) / totalPlayers) : 0,
      highest_score: totalPlayers > 0 ? session.players[0].score : 0,
      completion_rate: Math.round((totalQuestions / session.questions.length) * 100),
      duration_minutes: session.started_at ? Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000) : 0
    }
    
    session.final_stats = gameStats
    
    await writeFile(sessionPath, JSON.stringify(session, null, 2))
    
    return NextResponse.json({ 
      success: true, 
      session,
      stats: gameStats,
      message: 'Game ended successfully'
    })
  } catch (error) {
    console.error('Error ending session:', error)
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 })
  }
}
