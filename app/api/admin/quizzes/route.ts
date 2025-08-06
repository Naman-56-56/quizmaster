import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readdir, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const DATA_DIR = join(process.cwd(), 'data', 'quizzes')

// Ensure data directory exists
async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true })
  }
}

export async function GET() {
  try {
    await ensureDataDir()
    const files = await readdir(DATA_DIR)
    const quizFiles = files.filter(file => file.endsWith('.json'))
    
    const quizzes = await Promise.all(
      quizFiles.map(async (file) => {
        const filePath = join(DATA_DIR, file)
        const content = await readFile(filePath, 'utf-8')
        return JSON.parse(content)
      })
    )
    
    return NextResponse.json({ quizzes })
  } catch (error) {
    console.error('Error loading quizzes:', error)
    return NextResponse.json({ quizzes: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDataDir()
    const body = await request.json()
    
    const quizId = `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const quiz = {
      id: quizId,
      title: body.title,
      description: body.description,
      questions: body.questions,
      created_at: new Date().toISOString(),
      settings: {
        time_per_question: body.time_per_question || 30,
        randomize_questions: body.randomize_questions || false,
        show_correct_answer: body.show_correct_answer || true,
        allow_review: body.allow_review || false
      }
    }
    
    const filePath = join(DATA_DIR, `${quizId}.json`)
    await writeFile(filePath, JSON.stringify(quiz, null, 2))
    
    return NextResponse.json({ quiz })
  } catch (error) {
    console.error('Error creating quiz:', error)
    return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 })
  }
}
