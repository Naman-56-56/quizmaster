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
    
    // Show current question results first
    const currentQuestion = session.questions[session.current_question_index]
    const responses = session.responses || {}
    
    // Calculate question statistics
    const totalResponses = Object.keys(responses).length
    const correctAnswers = Object.values(responses).filter((r: any) => r.answer === currentQuestion.correct_answer).length
    const accuracy = totalResponses > 0 ? Math.round((correctAnswers / totalResponses) * 100) : 0
    
    // Move to next question or end game
    if (session.current_question_index < session.questions.length - 1) {
      session.current_question_index++
      session.question_start_time = Date.now()
      session.responses = {}
      session.updated_at = new Date().toISOString()
      
      await writeFile(sessionPath, JSON.stringify(session, null, 2))
      
      return NextResponse.json({ 
        success: true, 
        session,
        question_stats: {
          total_responses: totalResponses,
          correct_answers: correctAnswers,
          accuracy: accuracy,
          question_number: session.current_question_index,
          total_questions: session.questions.length
        }
      })
    } else {
      // End game
      session.status = 'finished'
      session.ended_at = new Date().toISOString()
      
      // Calculate final rankings
      session.players.sort((a: any, b: any) => b.score - a.score)
      session.players.forEach((player: any, index: number) => {
        player.final_rank = index + 1
      })
      
      await writeFile(sessionPath, JSON.stringify(session, null, 2))
      
      return NextResponse.json({ 
        success: true, 
        session,
        game_ended: true,
        final_stats: {
          total_players: session.players.length,
          total_questions: session.questions.length,
          winner: session.players[0],
          average_score: Math.round(session.players.reduce((sum: number, p: any) => sum + p.score, 0) / session.players.length)
        }
      })
    }
  } catch (error) {
    console.error('Error advancing question:', error)
    return NextResponse.json({ error: 'Failed to advance question' }, { status: 500 })
  }
}
