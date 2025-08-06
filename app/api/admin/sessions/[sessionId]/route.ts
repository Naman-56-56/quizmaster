import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
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
    
    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error loading session:', error)
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await request.json()
    const sessionPath = join(SESSIONS_DIR, `${params.sessionId}.json`)
    
    // Read current session
    const content = await readFile(sessionPath, 'utf-8')
    const session = JSON.parse(content)
    
    // Update session with new data
    const updatedSession = { ...session, ...body, updated_at: new Date().toISOString() }
    
    // Save updated session
    await writeFile(sessionPath, JSON.stringify(updatedSession, null, 2))
    
    return NextResponse.json({ session: updatedSession })
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}
