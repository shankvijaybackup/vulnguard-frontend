'use client'

import { useState, useEffect, useCallback } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'

export interface Scan {
  id: string
  targetUrl: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'crawling' | 'analyzing' | 'testing' | 'classifying'
  startTime: string
  endTime?: string
  resultsCount?: number
  results?: Vulnerability[]
  anonymous?: boolean
  progress?: number
  currentPhase?: string
  statusMessage?: string
  lastUpdated?: string
  phases?: Array<{
    name: string
    status: 'pending' | 'in_progress' | 'completed'
    timestamp?: string
  }>
  summary?: {
    total: number
    high: number
    medium: number
    low: number
  }
}

export interface Vulnerability {
  id: string
  type: string
  severity: 'High' | 'Medium' | 'Low'
  url: string
  description: string
  confidence: number
  impact: string
  remediation: string
  anonymous: boolean
  discoveredAt: string
}

export interface ScanReport {
  scanId: string
  targetUrl: string
  scanDate: string
  completionDate?: string
  status: string
  anonymous: boolean
  privacyNote: string
  duration: number
  summary: {
    totalVulnerabilities: number
    high: number
    medium: number
    low: number
  }
  phases: Array<{
    name: string
    status: string
    timestamp?: string
  }>
}

export default function ScanDashboard() {
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(false)
  const [pollingIntervals, setPollingIntervals] = useState<{[key: string]: NodeJS.Timeout}>({})
  const [exportingScan, setExportingScan] = useState<string | null>(null)

  // Clear session data on component mount for privacy
  useEffect(() => {
    clearSessionData()
    return () => {
      // Cleanup polling intervals
      Object.values(pollingIntervals).forEach(interval => clearInterval(interval))
    }
  }, [pollingIntervals])

  const clearSessionData = async (): Promise<void> => {
    try {
      await fetch('/api/scans/clear', { method: 'POST' })
      setScans([])
    } catch (error) {
      console.error('Failed to clear session:', error)
    }
  }

  const loadScanResults = useCallback(async (scanId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/scans/${scanId}/results`)
      const data = await response.json()

      if (data.success) {
        setScans(prev => prev.map(scan =>
          scan.id === scanId
            ? {
                ...scan,
                results: data.vulnerabilities,
                resultsCount: data.count,
                summary: data.summary
              }
            : scan
        ))
      }
    } catch (error) {
      console.error('Failed to load scan results:', error)
    }
  }, [])

  const startPolling = useCallback((scanId: string): void => {
    if (pollingIntervals[scanId]) return

    const interval = setInterval(async (): Promise<void> => {
      try {
        const response = await fetch(`/api/scans/${scanId}/status`)
        const data = await response.json()

        if (data.success) {
          setScans(prev => prev.map(scan =>
            scan.id === scanId
              ? {
                  ...scan,
                  status: data.status,
                  progress: data.progress,
                  currentPhase: data.currentPhase,
                  statusMessage: data.statusMessage,
                  lastUpdated: data.lastUpdated,
                  phases: data.phases
                }
              : scan
          ))

          // Stop polling if scan is complete or failed
          if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
            clearInterval(interval)
            setPollingIntervals(prev => {
              const updated = {...prev}
              delete updated[scanId]
              return updated
            })

            // Load results if completed
            if (data.status === 'completed') {
              loadScanResults(scanId)
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll scan status:', error)
      }
    }, 1500) // Poll every 1.5 seconds

    setPollingIntervals(prev => ({...prev, [scanId]: interval}))
  }, [pollingIntervals, loadScanResults])

  // Poll for scan status updates
  useEffect(() => {
    scans.forEach(scan => {
      if (scan.status === 'running' || scan.status === 'pending') {
        startPolling(scan.id)
      }
    })
  }, [scans, startPolling])

  const generateCSVReport = (report: ScanReport, vulnerabilities: Vulnerability[]): string => {
    const headers = [
      'Scan ID',
      'Target URL',
      'Start Time',
      'End Time',
      'Duration (seconds)',
      'Status',
      'Total Vulnerabilities',
      'High Severity',
      'Medium Severity',
      'Low Severity'
    ]

    const summaryRow = [
      report.scanId,
      report.targetUrl,
      report.scanDate,
      report.completionDate || 'N/A',
      report.duration.toString(),
      report.status,
      report.summary.totalVulnerabilities.toString(),
      report.summary.high.toString(),
      report.summary.medium.toString(),
      report.summary.low.toString()
    ]

    const vulnRows = vulnerabilities.map((vuln: Vulnerability) => [
      vuln.id,
      vuln.type,
      vuln.severity,
      vuln.url,
      vuln.description,
      (vuln.confidence * 100).toFixed(1) + '%',
      vuln.impact,
      vuln.remediation
    ])

    const allRows = [summaryRow, ...vulnRows]
    return [headers, ...allRows].map(row => row.join(',')).join('\n')
  }

  const exportScanReport = async (scanId: string): Promise<void> => {
    try {
      setExportingScan(scanId)
      // Fetch both report summary and vulnerability details
      const [reportResponse, resultsResponse] = await Promise.all([
        fetch(`/api/scans/${scanId}/report`),
        fetch(`/api/scans/${scanId}/results`)
      ])

      const reportData = await reportResponse.json()
      const resultsData = await resultsResponse.json()

      if (reportData.success && resultsData.success) {
        // Generate CSV content with both summary and vulnerability details
        const csvContent = generateCSVReport(reportData.report, resultsData.vulnerabilities || [])

        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `vulnguard-report-${scanId}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export report:', error)
    } finally {
      setExportingScan(null)
    }
  }

  const startScan = async (targetUrl?: string): Promise<void> => {
    try {
      setLoading(true)
      const response = await fetch('/api/scans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUrl: targetUrl || undefined, // Let backend choose realistic target if none provided
          scanOptions: {
            enableSpider: true,
            enableActive: true,
            maxChildren: 10
          }
        })
      })
      const data = await response.json()

      const newScan: Scan = {
        id: data.data.id,
        targetUrl: data.data.targetUrl,
        status: 'pending',
        startTime: data.data.startTime,
        anonymous: true,
        progress: 0,
        currentPhase: 'pending',
        statusMessage: 'Initializing scan...'
      }

      setScans(prev => [newScan, ...prev])
    } catch (error) {
      console.error('Failed to start scan:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderProgressBar = (scan: Scan) => {
    const progress = scan.progress || 0
    return (
      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    )
  }

  const renderPhaseIndicator = (scan: Scan) => {
    if (!scan.phases) return null

    return (
      <div className="mt-3 space-y-1">
        {scan.phases.map((phase, index) => (
          <div key={index} className="flex items-center text-xs">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              phase.status === 'completed' ? 'bg-green-500' :
              phase.status === 'in_progress' ? 'bg-blue-500 animate-pulse' :
              'bg-gray-300'
            }`}></div>
            <span className={phase.status === 'in_progress' ? 'text-blue-600 font-medium' : 'text-gray-500'}>
              {phase.name}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const renderExportSection = (scan: Scan) => {
    if (scan.status !== 'completed' || !scan.resultsCount) return null

    return (
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-green-800">Scan Complete!</h4>
            <p className="text-sm text-green-700 mt-1">
              {scan.resultsCount} vulnerabilities found. Export your report below.
            </p>
          </div>
          <button
            onClick={() => exportScanReport(scan.id)}
            disabled={exportingScan === scan.id}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {exportingScan === scan.id ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l4-4m-4 4l-4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Export CSV</span>
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  const renderScansView = () => (
    <div className="space-y-8">
      {/* Privacy Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Anonymous & Private Scanning
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                VulnGuard respects your privacy. All scans are anonymous and session-only.
                No personal data is collected or stored. Scans are cleared when you leave this page.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Scan Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Start New Anonymous Scan</h3>
            <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault()
              const targetUrl = (e.target as HTMLFormElement).url.value
              if (targetUrl) {
                startScan(targetUrl)
                ;(e.target as HTMLFormElement).reset()
              }
            }}>
              <div className="mb-4">
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                  Target URL (Optional)
                </label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  placeholder="https://example.com or leave empty for demo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Starting Scan...' : 'Start Anonymous Scan'}
              </button>
            </form>
          </div>
        </div>

        {/* Current Session Scans */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Current Session Scans</h3>
              <button
                onClick={clearSessionData}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Clear Session
              </button>
            </div>

            {scans.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No active scans</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start your first anonymous scan to begin vulnerability testing.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {scans.map((scan: Scan) => (
                  <div
                    key={scan.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900 truncate">
                              {scan.targetUrl}
                            </p>
                            {scan.anonymous && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Anonymous
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            Started: {new Date(scan.startTime).toLocaleString()}
                          </p>
                        </div>
                        <div className="ml-4 text-right">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            scan.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : scan.status === 'running'
                              ? 'bg-blue-100 text-blue-800'
                              : scan.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {scan.status}
                          </span>
                        </div>
                      </div>

                      {/* Progress */}
                      {scan.status !== 'completed' && scan.status !== 'failed' && scan.status !== 'cancelled' && (
                        <>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Progress</span>
                              <span className="font-medium">{scan.progress || 0}%</span>
                            </div>
                            {renderProgressBar(scan)}
                          </div>

                          {/* Current Phase */}
                          {scan.statusMessage && (
                            <div className="flex items-center space-x-2 text-sm">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                              <span className="text-blue-600">{scan.statusMessage}</span>
                            </div>
                          )}

                          {/* Phase Indicators */}
                          {renderPhaseIndicator(scan)}
                        </>
                      )}

                      {/* Results Summary */}
                      {scan.status === 'completed' && scan.resultsCount !== undefined && (
                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Vulnerabilities Found:</span>
                            <span className="font-medium text-gray-900">{scan.resultsCount}</span>
                          </div>
                          {scan.summary && (
                            <div className="mt-2 flex space-x-4 text-xs">
                              <span className="text-red-600">High: {scan.summary.high}</span>
                              <span className="text-yellow-600">Medium: {scan.summary.medium}</span>
                              <span className="text-green-600">Low: {scan.summary.low}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Export Section */}
                      {renderExportSection(scan)}

                      {/* Last Updated */}
                      {scan.lastUpdated && (
                        <div className="text-xs text-gray-400">
                          Last updated: {new Date(scan.lastUpdated).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Anonymous Vulnerability Scanner</h1>
          <p className="text-gray-600">Private, session-only security testing with no data retention</p>
        </div>
        {renderScansView()}
      </div>

      <Footer />
    </div>
  )
}
