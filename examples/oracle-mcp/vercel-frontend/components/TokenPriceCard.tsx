import { TrendingUp, TrendingDown } from 'lucide-react'

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

interface TokenPriceCardProps {
  data: TokenPrice
}

export function TokenPriceCard({ data }: TokenPriceCardProps) {
  const isPositive = (data.percentChange24h || 0) >= 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-white">{data.symbol}</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${data.priceUsd.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6
            })}
          </p>
          {data.percentChange24h && (
            <div className={`flex items-center gap-1 text-sm ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(data.percentChange24h).toFixed(2)}%
            </div>
          )}
        </div>

        {data.marketCap && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Market Cap</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              ${(data.marketCap / 1e9).toFixed(2)}B
            </p>
          </div>
        )}

        {data.volume24h && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">24h Volume</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              ${(data.volume24h / 1e6).toFixed(2)}M
            </p>
          </div>
        )}

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Source: {data.source}</p>
        </div>
      </div>
    </div>
  )
}