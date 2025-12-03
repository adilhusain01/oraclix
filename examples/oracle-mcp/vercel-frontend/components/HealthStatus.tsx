import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface HealthData {
  polygon: boolean
  gasTracker: boolean
  cache: number
  uptime: number
  timestamp: number
}

interface HealthStatusProps {
  health: HealthData | null
}

export function HealthStatus({ health }: HealthStatusProps) {
  if (!health) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
        <AlertCircle className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400">Unknown</span>
      </div>
    )
  }

  const isHealthy = health.polygon && health.gasTracker

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
      isHealthy
        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
        : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
    }`}>
      {isHealthy ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <XCircle className="w-4 h-4" />
      )}
      <span className="text-sm font-medium">
        {isHealthy ? 'Healthy' : 'Degraded'}
      </span>
    </div>
  )
}