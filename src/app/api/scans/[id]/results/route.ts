import { NextRequest, NextResponse } from 'next/server'

// This would normally be a database or external service
// For Vercel deployment, we'll use in-memory storage
const scanResults = new Map()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const results = scanResults.get(id)

    if (!results) {
      return NextResponse.json({
        success: false,
        error: 'Scan results not found',
        vulnerabilities: [],
        count: 0,
        summary: { total: 0, high: 0, medium: 0, low: 0 }
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      ...results
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch scan results' }, { status: 500 })
  }
}
