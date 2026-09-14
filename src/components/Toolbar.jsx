import { STEPS, stepIndex } from '../utils/steps'
import { DEFAULT_TEMPERATURE_C } from '../utils/acoustics'
import Logo from './Logo'
import Button from './Button'
import ThemeToggle from './ThemeToggle'

export default function Toolbar({ step, furthestStep, onJumpToStep, temperatureC, onTemperatureChange, onReset, hasImage }) {
  const furthestIdx = stepIndex(furthestStep)

  return (
    <header
      className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/95 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/95"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
        <Logo compact className="shrink-0" />

        <nav className="min-w-[240px] flex-1 overflow-x-auto" aria-label="Workflow steps">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const isDone = i < furthestIdx
              const isCurrent = s.key === step
              const isReachable = i <= furthestIdx
              return (
                <button
                  key={s.key}
                  type="button"
                  disabled={!isReachable}
                  onClick={() => isReachable && onJumpToStep(s.key)}
                  className={[
                    'whitespace-nowrap rounded border px-2.5 py-1 text-xs font-semibold transition-colors',
                    isCurrent
                      ? 'border-cyan-600 bg-cyan-600 text-white'
                      : isDone
                      ? 'border-emerald-600/30 bg-emerald-600/5 text-emerald-600 hover:bg-emerald-600/10'
                      : 'border-gray-200 text-gray-400 dark:border-zinc-800 dark:text-zinc-500',
                    isReachable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
                  ].join(' ')}
                >
                  {i + 1}. {s.label}
                </button>
              )
            })}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <label className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
            Air temp
            <input
              type="number"
              value={temperatureC}
              onChange={(e) => onTemperatureChange(Number(e.target.value))}
              className="data-value w-14 rounded border border-gray-200 bg-white px-1.5 py-1 text-xs font-normal normal-case tracking-normal text-gray-900 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              step={1}
            />
            °C
          </label>
          {temperatureC !== DEFAULT_TEMPERATURE_C && (
            <button
              type="button"
              onClick={() => onTemperatureChange(DEFAULT_TEMPERATURE_C)}
              className="text-[11px] text-gray-400 underline underline-offset-2 hover:text-cyan-600 dark:text-zinc-500"
            >
              reset
            </button>
          )}

          {hasImage && (
            <Button variant="outline" size="sm" onClick={onReset}>
              Start Over
            </Button>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
