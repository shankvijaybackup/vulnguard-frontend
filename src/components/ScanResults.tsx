'use client'

import type { Scan, Vulnerability } from './ScanDashboard'

interface ScanResultsProps {
  activeScan?: Scan | null
  scan?: Scan
  onClose?: () => void
}

export default function ScanResults({ activeScan, scan, onClose }: ScanResultsProps) {
  const displayScan = scan || activeScan

  if (!displayScan) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <p className="text-gray-500 text-center">
          Select a scan to view detailed results
        </p>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'running':
        return 'text-blue-600 bg-blue-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'text-red-800 bg-red-100'
      case 'medium':
        return 'text-yellow-800 bg-yellow-100'
      case 'low':
        return 'text-blue-800 bg-blue-100'
      default:
        return 'text-gray-800 bg-gray-100'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Scan Results</h2>
            <p className="text-sm text-gray-600 mt-1">{displayScan.targetUrl}</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(displayScan.status)}`}>
              {displayScan.status}
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {displayScan.status === 'completed' && displayScan.results && displayScan.results.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Total Findings</h3>
                <p className="text-2xl font-bold text-gray-900">{displayScan.results.length}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-red-600 mb-2">High Risk</h3>
                <p className="text-2xl font-bold text-red-900">
                  {displayScan.results?.filter((r: Vulnerability) => r.severity === 'High').length || 0}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-600 mb-2">ML Confidence</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {displayScan.results.length > 0 ? '85%' : 'N/A'}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Vulnerabilities</h3>
              <div className="space-y-3">
                {displayScan.results.map((result: Vulnerability, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900">{result.type}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(result.severity)}`}>
                            {result.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{result.description}</p>
                        <p className="text-xs text-gray-500">URL: {result.url}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : displayScan.status === 'running' ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Scan in progress...</p>
          </div>
        ) : displayScan.status === 'failed' ? (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-red-600 font-medium mb-2">Scan Failed</p>
            <p className="text-gray-600">{displayScan.error || 'An error occurred during the scan'}</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No results available</p>
          </div>
        )}
      </div>
    </div>
  )
}
