'use client'

import { useState, useEffect } from 'react'
import Navbar from './Navbar'

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

export interface Scan {
  id: string
  targetUrl: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime: string
  endTime?: string
  resultsCount?: number
  results?: Vulnerability[]
}

export default function Reports() {
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null)

  useEffect(() => {
    loadScans()
  }, [])

  const loadScans = async () => {
    try {
      const response = await fetch('/api/scans')
      const data = await response.json()
      setScans(data.data || [])
    } catch {
      console.error('Failed to load scans')
      setScans([])
    } finally {
      setLoading(false)
    }
  }

  const loadScanResults = async (scanId: string) => {
    try {
      const response = await fetch(`/api/scans/${scanId}/results`)
      const data = await response.json()
      
      setScans(prev => prev.map(scan => 
        scan.id === scanId 
          ? { ...scan, results: data.vulnerabilities || [], resultsCount: data.vulnerabilities?.length || 0 }
          : scan
      ))
      
      const scan = scans.find(s => s.id === scanId)
      if (scan) setSelectedScan({ ...scan, results: data.vulnerabilities || [] })
    } catch (error) {
      console.error('Failed to load scan results:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vulnerability Reports</h1>
          <p className="text-gray-600">View detailed scan results and vulnerability findings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scan History */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Scan History</h3>
            {scans.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No scans found</p>
            ) : (
              <div className="space-y-3">
                {scans.map((scan) => (
                  <div
                    key={scan.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (scan.status === 'completed' && scan.resultsCount) {
                        loadScanResults(scan.id)
                      } else {
                        setSelectedScan(scan)
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 truncate">
                          {scan.targetUrl}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(scan.startTime).toLocaleString()}
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
                        {scan.resultsCount !== undefined && (
                          <p className="text-sm text-gray-600 mt-1">
                            {scan.resultsCount} vulnerabilities
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scan Details / Results */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Scan Details</h3>
            {!selectedScan ? (
              <p className="text-gray-500 text-center py-8">
                Select a scan to view detailed results
              </p>
            ) : (
              <div>
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">{selectedScan.targetUrl}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                        selectedScan.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : selectedScan.status === 'running'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedScan.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Started:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(selectedScan.startTime).toLocaleString()}
                      </span>
                    </div>
                    {selectedScan.endTime && (
                      <div>
                        <span className="text-gray-500">Completed:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date(selectedScan.endTime).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Vulnerabilities:</span>
                      <span className="ml-2 text-gray-900">
                        {selectedScan.resultsCount || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedScan.results && selectedScan.results.length > 0 ? (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Vulnerability Details</h4>
                    <div className="space-y-3">
                      {selectedScan.results.map((vulnerability, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{vulnerability.type}</h5>
                              <p className="text-sm text-gray-600 mt-1">{vulnerability.description}</p>
                              <p className="text-sm text-gray-500 mt-2">URL: {vulnerability.url}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              vulnerability.severity === 'High'
                                ? 'bg-red-100 text-red-800'
                                : vulnerability.severity === 'Medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {vulnerability.severity}
                            </span>
                          </div>
                          <div className="mt-3">
                            <span className="text-xs text-gray-500">
                              Confidence: {Math.round(vulnerability.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    {selectedScan.status === 'completed' 
                      ? 'No vulnerabilities found in this scan'
                      : 'Scan results not available yet'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
