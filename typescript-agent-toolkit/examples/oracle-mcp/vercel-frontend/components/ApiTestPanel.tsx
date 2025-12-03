'use client'

import { useState } from 'react'
import { Play, Copy, Check } from 'lucide-react'

interface ApiTest {
  name: string
  method: 'GET' | 'POST'
  endpoint: string
  body?: any
}

const API_TESTS: ApiTest[] = [
  {
    name: 'Health Check',
    method: 'GET',
    endpoint: '/api/health'
  },
  {
    name: 'Get ETH Price',
    method: 'POST',
    endpoint: '/api/token-price',
    body: { symbol: 'ETH', network: 'polygon' }
  },
  {
    name: 'Get Polygon Gas Price',
    method: 'POST',
    endpoint: '/api/gas-price',
    body: { network: 'polygon' }
  },
  {
    name: 'Get Multi-Network Gas',
    method: 'POST',
    endpoint: '/api/multi-network-gas'
  },
  {
    name: 'Publish to Contract',
    method: 'POST',
    endpoint: '/api/publish-to-contract',
    body: {
      eventName: 'TestEvent',
      contractAddress: '0x1234567890123456789012345678901234567890',
      data: { test: true, timestamp: Date.now() }
    }
  }
]

export function ApiTestPanel() {
  const [results, setResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState('')

  const runTest = async (test: ApiTest) => {
    setLoading(prev => ({ ...prev, [test.name]: true }))
    try {
      const options: RequestInit = {
        method: test.method,
        headers: { 'Content-Type': 'application/json' }
      }

      if (test.body) {
        options.body = JSON.stringify(test.body)
      }

      const response = await fetch(test.endpoint, options)
      const result = await response.json()

      setResults(prev => ({
        ...prev,
        [test.name]: {
          status: response.status,
          data: result,
          timestamp: new Date().toLocaleTimeString()
        }
      }))
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [test.name]: {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toLocaleTimeString()
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, [test.name]: false }))
    }
  }

  const copyResult = async (testName: string) => {
    const result = results[testName]
    if (result) {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2))
      setCopied(testName)
      setTimeout(() => setCopied(''), 2000)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {API_TESTS.map((test) => (
          <div key={test.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-white">{test.name}</h3>
              <span className={`text-xs px-2 py-1 rounded ${
                test.method === 'GET'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              }`}>
                {test.method}
              </span>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-mono">
              {test.endpoint}
            </p>

            {test.body && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Request Body:</p>
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                  {JSON.stringify(test.body, null, 2)}
                </pre>
              </div>
            )}

            <button
              onClick={() => runTest(test)}
              disabled={loading[test.name]}
              className="btn-primary w-full flex items-center justify-center gap-2 mb-3"
            >
              <Play className="w-4 h-4" />
              {loading[test.name] ? 'Running...' : 'Run Test'}
            </button>

            {results[test.name] && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {results[test.name].timestamp}
                  </span>
                  <button
                    onClick={() => copyResult(test.name)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {copied === test.name ? (
                      <><Check className="w-3 h-3" /> Copied</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy</>
                    )}
                  </button>
                </div>

                <div className={`text-xs px-2 py-1 rounded ${
                  results[test.name].status === 200
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  Status: {results[test.name].status}
                </div>

                <div className="max-h-40 overflow-y-auto">
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {JSON.stringify(
                      results[test.name].data || results[test.name].error,
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}