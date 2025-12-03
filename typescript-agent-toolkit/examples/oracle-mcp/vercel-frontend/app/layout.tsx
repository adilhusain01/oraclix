import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Oracle MCP Dashboard',
  description: 'Real-time blockchain data oracle for AI agents',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50 dark:bg-gray-900">
        <div className="min-h-full">
          {children}
        </div>
      </body>
    </html>
  )
}