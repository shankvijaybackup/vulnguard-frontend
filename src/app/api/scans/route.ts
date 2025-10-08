import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for demo purposes (resets on deployment)
const scans = new Map()
const scanResults = new Map()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const scansArray = Array.from(scans.values()).map(scan => ({
      id: scan.id,
      targetUrl: scan.targetUrl,
      status: scan.status,
      startTime: scan.startTime,
      endTime: scan.endTime,
      resultsCount: scan.resultsCount,
      progress: scan.progress,
      currentPhase: scan.currentPhase,
      statusMessage: scan.statusMessage,
      lastUpdated: scan.lastUpdated,
      phases: scan.phases,
      summary: scan.summary,
      anonymous: true
    }))

    return NextResponse.json({
      success: true,
      data: scansArray,
      count: scansArray.length,
      note: 'Anonymous session - no data persistence'
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch scans' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { targetUrl, scanOptions } = body

    const scanId = `scan_${Date.now()}`
    const now = new Date().toISOString()

    const newScan = {
      id: scanId,
      targetUrl: targetUrl || 'https://demo-site.com',
      status: 'pending',
      startTime: now,
      progress: 0,
      currentPhase: 'pending',
      statusMessage: 'Initializing scan...',
      phases: [
        { name: 'Initialization', status: 'completed', timestamp: now },
        { name: 'Crawling', status: 'in_progress', timestamp: null },
        { name: 'Analysis', status: 'pending', timestamp: null },
        { name: 'Testing', status: 'pending', timestamp: null },
        { name: 'Classification', status: 'pending', timestamp: null }
      ],
      scanOptions: scanOptions || {
        enableSpider: true,
        enableActive: true,
        maxChildren: 10,
        scanPolicy: 'Default Policy',
        timeout: 1800
      },
      anonymous: true,
      privacyNote: 'This scan is anonymous and will not be stored after your session',
      lastUpdated: now
    }

    scans.set(scanId, newScan)

    // Start mock scan process
    startMockScan(scanId)

    return NextResponse.json({
      success: true,
      data: newScan,
      message: 'Anonymous scan started successfully',
      privacyNote: 'Your scan data will be cleared when you leave this page'
    }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to start scan' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    scans.clear()
    scanResults.clear()
    return NextResponse.json({ success: true, message: 'All session data cleared' })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to clear session' }, { status: 500 })
  }
}

function startMockScan(scanId: string) {
  const phases = ['crawling', 'analyzing', 'testing', 'classifying', 'completed']
  let phaseIndex = 0

  const interval = setInterval(() => {
    const scan = scans.get(scanId)
    if (!scan) {
      clearInterval(interval)
      return
    }

    if (phaseIndex < phases.length) {
      const currentPhase = phases[phaseIndex]
      const progress = Math.min(20 + (phaseIndex * 20), 100)

      const updatedScan = {
        ...scan,
        status: currentPhase === 'completed' ? 'completed' : 'running',
        progress,
        currentPhase,
        statusMessage: getPhaseMessage(currentPhase),
        lastUpdated: new Date().toISOString(),
        phases: scan.phases.map((phase: { name: string; status: string; timestamp?: string }, index: number) =>
          index === phaseIndex
            ? { ...phase, status: 'completed', timestamp: new Date().toISOString() }
            : index === phaseIndex + 1
            ? { ...phase, status: 'in_progress' }
            : phase
        )
      }

      scans.set(scanId, updatedScan)

      if (currentPhase === 'completed') {
        clearInterval(interval)
        generateMockResults(scanId)
      }

      phaseIndex++
    }
  }, 2000) // 2 seconds per phase for demo
}

function getPhaseMessage(phase: string): string {
  const messages = {
    crawling: 'Crawling target website...',
    analyzing: 'Analyzing page content...',
    testing: 'Testing for vulnerabilities...',
    classifying: 'Classifying findings...',
    completed: 'Scan completed successfully'
  }
  return messages[phase as keyof typeof messages] || 'Processing...'
}

function generateMockResults(scanId: string) {
  const mockVulnerabilities = [
    {
      id: `${scanId}_0`,
      type: 'SQL Injection',
      severity: 'High',
      url: 'https://demo-site.com/search',
      description: 'Potential SQL injection vulnerability detected in search functionality',
      confidence: 0.87,
      impact: 'Data breach, unauthorized access',
      remediation: 'Use parameterized queries, input sanitization, prepared statements',
      anonymous: true,
      discoveredAt: new Date().toISOString()
    }
  ]

  const summary = {
    total: 1,
    high: 1,
    medium: 0,
    low: 0
  }

  scanResults.set(scanId, {
    vulnerabilities: mockVulnerabilities,
    count: mockVulnerabilities.length,
    summary
  })

  const scan = scans.get(scanId)
  if (scan) {
    scans.set(scanId, {
      ...scan,
      status: 'completed',
      resultsCount: mockVulnerabilities.length,
      summary,
      lastUpdated: new Date().toISOString()
    })
  }
}
