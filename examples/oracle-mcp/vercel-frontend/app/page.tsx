'use client'

import { useEffect, useState } from 'react'
import { Activity, TrendingUp, Zap, Globe, DollarSign, Clock } from 'lucide-react'
import { TokenPriceCard } from '../components/TokenPriceCard'
import { GasPriceCard } from '../components/GasPriceCard'
import { HealthStatus } from '../components/HealthStatus'
import { HistoricalPriceChart } from '../components/HistoricalPriceChart'
import { ApiTestPanel } from '../components/ApiTestPanel'

interface HealthData {
  polygon: boolean
  gasTracker: boolean
  cache: number
  uptime: number
  timestamp: number
}

interface TokenPrice {
  symbol: string
  price: number
  priceUsd: number
  timestamp: number
  source: string
  marketCap?: number
  volume24h?: number
  percentChange24h?: number
}

interface GasPrice {
  network: string
  standard: number
  fast: number
  instant: number
  timestamp: number
  unit: string
}

export default function Dashboard() {
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [tokenPrices, setTokenPrices] = useState<Record<string, TokenPrice>>({})
  const [gasPrices, setGasPrices] = useState<Record<string, GasPrice>>({})
  const [loading, setLoading] = useState(true)

  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/health')
      const result = await response.json()
      if (result.success) {
        setHealthData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch health data:', error)
    }
  }

  const fetchTokenPrice = async (symbol: string) => {
    try {
      const response = await fetch('/api/token-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, network: 'polygon' })
      })
      const result = await response.json()
      if (result.success) {
        setTokenPrices(prev => ({ ...prev, [symbol]: result.data }))
      }
    } catch (error) {
      console.error(`Failed to fetch ${symbol} price:`, error)
    }
  }

  const fetchGasPrice = async (network: string) => {
    try {
      const response = await fetch('/api/gas-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network })
      })
      const result = await response.json()
      if (result.success) {
        setGasPrices(prev => ({ ...prev, [network]: result.data }))
      }
    } catch (error) {
      console.error(`Failed to fetch ${network} gas price:`, error)
    }
  }

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchHealthData(),
        fetchTokenPrice('ETH'),
        fetchTokenPrice('BTC'),
        fetchTokenPrice('MATIC'),
        fetchTokenPrice('USDC'),
        fetchGasPrice('polygon'),
        fetchGasPrice('ethereum')
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInitialData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchInitialData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !healthData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="text-blue-500" />
            Oracle MCP Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time blockchain data oracle for AI agents
          </p>
        </div>
        <div className="flex items-center gap-4">
          <HealthStatus health={healthData} />
          <button
            onClick={fetchInitialData}
            className="btn-primary flex items-center gap-2"
            disabled={loading}
          >
            <Activity className="w-4 h-4" />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">ETH Price</p>
              <p className="text-2xl font-bold">
                ${tokenPrices.ETH?.priceUsd?.toLocaleString() || '---'}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Polygon Gas</p>
              <p className="text-2xl font-bold">
                {gasPrices.polygon?.fast || '---'} gwei
              </p>
            </div>
            <Zap className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Cache Entries</p>
              <p className="text-2xl font-bold">{healthData?.cache || 0}</p>
            </div>
            <Globe className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Uptime</p>
              <p className="text-2xl font-bold">
                {healthData?.uptime ? Math.floor(healthData.uptime / 3600) : 0}h
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Token Prices */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="text-green-500" />
            Token Prices
          </h2>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(tokenPrices).map(([symbol, data]) => (
              <TokenPriceCard key={symbol} data={data} />
            ))}
          </div>
        </div>
      </div>

      {/* Gas Prices */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="text-yellow-500" />
            Gas Prices
          </h2>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(gasPrices).map(([network, data]) => (
              <GasPriceCard key={network} data={data} />
            ))}
          </div>
        </div>
      </div>

      {/* Historical Price Chart */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Historical Price Chart
          </h2>
        </div>
        <div className="card-content">
          <HistoricalPriceChart />
        </div>
      </div>

      {/* API Testing Panel */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            API Test Panel
          </h2>
        </div>
        <div className="card-content">
          <ApiTestPanel />
        </div>
      </div>
    </div>
  )
}