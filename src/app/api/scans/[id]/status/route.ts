import { NextResponse } from 'next/server'

// This would normally be a database or external service
// For Vercel deployment, we'll use in-memory storage
const scans = new Map()

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const scan = scans.get(params.id)

    if (!scan) {
      return NextResponse.json({ success: false, error: 'Scan not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      status: scan.status,
      progress: scan.progress,
      currentPhase: scan.currentPhase,
      statusMessage: scan.statusMessage,
      lastUpdated: scan.lastUpdated,
      phases: scan.phases
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch scan status' }, { status: 500 })
  }
}
