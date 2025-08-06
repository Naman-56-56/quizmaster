import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

const SESSIONS_DIR = join(process.cwd(), 'data', 'sessions')

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionPath = join(SESSIONS_DIR, `${params.sessionId}.json`)
    const content = await readFile(sessionPath, 'utf-8')
    const session = JSON.parse(content)
    
    // Sort players by score (descending)
    const sortedPlayers = [...session.players].sort((a, b) => b.score - a.score)
    
    // Add rank to each player
    const leaderboard = sortedPlayers.map((player, index) => ({
      id: player.id,
      nickname: player.nickname,
      score: player.score,
      rank: index + 1,
      is_online: player.is_online || true,
      last_answer: player.last_answer,
      is_correct: player.is_correct,
      answer_time: player.answer_time,
      joined_at: player.joined_at
    }))
    
    // Get current question stats
    const currentQuestion = session.questions[session.current_question_index]
    const responses = session.responses || {}
    const totalResponses = Object.keys(responses).length
    
    // Calculate response distribution
    const responseDistribution = currentQuestion ? currentQuestion.options.map((option: string, index: number) => {
      const count = Object.values(responses).filter((r: any) => r.answer === index).length
      return {
        option_index: index,
        option_text: option,
        count,
        percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
        is_correct: index === currentQuestion.correct_answer
      }
    }) : []
    
    return NextResponse.json({
      leaderboard,
      session_info: {
        id: session.id,
        title: session.quiz_title,
        status: session.status,
        current_question: session.current_question_index + 1,
        total_questions: session.questions.length,
        total_players: session.players.length,
        total_responses: totalResponses,
        response_rate: session.players.length > 0 ? Math.round((totalResponses / session.players.length) * 100) : 0
      },
      current_question: currentQuestion ? {
        number: session.current_question_index + 1,
        text: currentQuestion.text,
        type: currentQuestion.type,
        time_limit: currentQuestion.time_limit,
        response_distribution: responseDistribution
      } : null,
      stats: {
        average_score: leaderboard.length > 0 ? Math.round(leaderboard.reduce((sum, p) => sum + p.score, 0) / leaderboard.length) : 0,
        highest_score: leaderboard.length > 0 ? leaderboard[0].score : 0,
        active_players: leaderboard.filter(p => p.is_online).length
      }
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
