import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readdir, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const SESSIONS_DIR = join(process.cwd(), 'data', 'sessions')
const QUIZZES_DIR = join(process.cwd(), 'data', 'quizzes')

async function ensureDataDirs() {
  if (!existsSync(SESSIONS_DIR)) {
    await mkdir(SESSIONS_DIR, { recursive: true })
  }
  if (!existsSync(QUIZZES_DIR)) {
    await mkdir(QUIZZES_DIR, { recursive: true })
  }
}

// Get all sessions
export async function GET() {
  try {
    await ensureDataDirs()
    const files = await readdir(SESSIONS_DIR)
    const sessionFiles = files.filter(file => file.endsWith('.json'))
    
    const sessions = await Promise.all(
      sessionFiles.map(async (file) => {
        const filePath = join(SESSIONS_DIR, file)
        const content = await readFile(filePath, 'utf-8')
        return JSON.parse(content)
      })
    )
    
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error loading sessions:', error)
    return NextResponse.json({ sessions: [] })
  }
}

// Create new session
export async function POST(request: NextRequest) {
  try {
    await ensureDataDirs()
    const body = await request.json()
    const { quiz_id } = body
    
    // Load the quiz from JSON file
    const quizPath = join(QUIZZES_DIR, `${quiz_id}.json`)
    const quizContent = await readFile(quizPath, 'utf-8')
    const quiz = JSON.parse(quizContent)
    
    // Generate unique 6-digit code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const session = {
      id: sessionId,
      quiz_id,
      quiz_title: quiz.title,
      code,
      status: 'waiting',
      participants: 0,
      created_at: new Date().toISOString(),
      current_question_index: 0,
      questions: quiz.questions,
      players: [],
      time_remaining: 0,
      responses: {},
      settings: quiz.settings
    }
    
    // Save session to JSON file
    const sessionPath = join(SESSIONS_DIR, `${sessionId}.json`)
    await writeFile(sessionPath, JSON.stringify(session, null, 2))
    
    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
