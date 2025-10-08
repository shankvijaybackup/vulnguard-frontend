import { NextRequest, NextResponse } from 'next/server'

// This would normally be a database or external service
// For Vercel deployment, we'll use in-memory storage
const scans = new Map()
const scanResults = new Map()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const scan = scans.get(id)
    const results = scanResults.get(id)

    if (!scan) {
      return NextResponse.json({ success: false, error: 'Scan not found' }, { status: 404 })
    }

    const report = {
      scanId: scan.id,
      targetUrl: scan.targetUrl,
      scanDate: scan.startTime,
      completionDate: scan.endTime,
      status: scan.status,
      anonymous: scan.anonymous,
      privacyNote: scan.privacyNote,
      duration: scan.endTime ? (new Date(scan.endTime).getTime() - new Date(scan.startTime).getTime()) / 1000 : 0,
      summary: scan.summary || { totalVulnerabilities: 0, high: 0, medium: 0, low: 0 },
      phases: scan.phases
    }

    return NextResponse.json({
      success: true,
      report,
      vulnerabilities: results?.vulnerabilities || []
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch scan report' }, { status: 500 })
  }
}
