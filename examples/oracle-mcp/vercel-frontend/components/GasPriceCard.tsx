import { Zap } from 'lucide-react'

interface GasPrice {
  network: string
  standard: number
  fast: number
  instant: number
  timestamp: number
  unit: string
}

interface GasPriceCardProps {
  data: GasPrice
}

export function GasPriceCard({ data }: GasPriceCardProps) {
  const getNetworkColor = (network: string) => {
    switch (network.toLowerCase()) {
      case 'polygon':
        return 'bg-purple-500'
      case 'ethereum':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getNetworkColor(data.network)}`}></div>
          <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
            {data.network}
          </h3>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
          <span className="text-sm text-gray-600 dark:text-gray-400">Standard</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {data.standard} {data.unit}
          </span>
        </div>

        <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
          <span className="text-sm text-yellow-700 dark:text-yellow-400">Fast</span>
          <span className="font-medium text-yellow-800 dark:text-yellow-300">
            {data.fast} {data.unit}
          </span>
        </div>

        <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
          <span className="text-sm text-red-700 dark:text-red-400 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Instant
          </span>
          <span className="font-medium text-red-800 dark:text-red-300">
            {data.instant} {data.unit}
          </span>
        </div>
      </div>
    </div>
  )
}