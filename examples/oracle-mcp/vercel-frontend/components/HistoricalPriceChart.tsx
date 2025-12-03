'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface HistoricalDataPoint {
  date: string
  price: number
}

export function HistoricalPriceChart() {
  const [data, setData] = useState<HistoricalDataPoint[]>([])
  const [symbol, setSymbol] = useState('ETH')
  const [loading, setLoading] = useState(false)

  const fetchHistoricalData = async (tokenSymbol: string) => {
    setLoading(true)
    try {
      const today = new Date()
      const promises = []

      // Fetch last 7 days of data
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateString = date.toISOString().split('T')[0]

        promises.push(
          fetch('/api/historical-price', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbol: tokenSymbol,
              date: dateString,
              network: 'polygon'
            })
          }).then(res => res.json()).then(result => {
            if (result.success) {
              return {
                date: dateString,
                price: result.data.priceUsd
              }
            }
            return null
          }).catch(() => null)
        )
      }

      const results = await Promise.all(promises)
      const validData = results.filter(Boolean) as HistoricalDataPoint[]
      setData(validData)
    } catch (error) {
      console.error('Failed to fetch historical data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistoricalData(symbol)
  }, [symbol])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Token:
        </label>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="input max-w-xs"
        >
          <option value="ETH">Ethereum (ETH)</option>
          <option value="BTC">Bitcoin (BTC)</option>
          <option value="MATIC">Polygon (MATIC)</option>
          <option value="USDC">USD Coin (USDC)</option>
        </select>
        <button
          onClick={() => fetchHistoricalData(symbol)}
          disabled={loading}
          className="btn-secondary"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {data.length > 0 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                className="text-sm"
              />
              <YAxis
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                className="text-sm"
              />
              <Tooltip
                labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString()}`}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
                contentStyle={{
                  backgroundColor: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#1D4ED8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : loading ? (
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
          No historical data available
        </div>
      )}
    </div>
  )
}