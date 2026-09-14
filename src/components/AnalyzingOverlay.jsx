import { Sparkles } from 'lucide-react'
import Button from './Button'

export default function AnalyzingOverlay({ error, onRetry }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm dark:bg-zinc-950/70">
      <div className="flex max-w-xs flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-5 text-center shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        {error ? (
          <>
            <p className="text-xs font-semibold text-red-500">Couldn't analyze this photo</p>
            <p className="text-xs text-gray-500 dark:text-zinc-400">{error}</p>
            <Button size="sm" onClick={onRetry}>
              Retry Analysis
            </Button>
          </>
        ) : (
          <>
            <Sparkles className="animate-pulse text-cyan-600" size={24} strokeWidth={1.75} />
            <p className="font-display text-sm font-semibold text-gray-900 dark:text-white">Analyzing venue photo…</p>
            <p className="text-xs text-gray-500 dark:text-zinc-400">Estimating scale and finding a good stage spot.</p>
          </>
        )}
      </div>
    </div>
  )
}
