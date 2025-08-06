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
    
    session.status = 'paused'
    session.paused_at = new Date().toISOString()
    session.updated_at = new Date().toISOString()
    
    await writeFile(sessionPath, JSON.stringify(session, null, 2))
    
    return NextResponse.json({ success: true, session })
  } catch (error) {
    console.error('Error pausing session:', error)
    return NextResponse.json({ error: 'Failed to pause session' }, { status: 500 })
  }
}
