import { STEPS, stepIndex } from '../utils/steps'
import { DEFAULT_TEMPERATURE_C } from '../utils/acoustics'

export default function Toolbar({ step, furthestStep, onJumpToStep, temperatureC, onTemperatureChange, onReset, hasImage }) {
  const currentIdx = stepIndex(step)
  const furthestIdx = stepIndex(furthestStep)

  return (
    <header className="border-b border-slate/20 bg-ink-navy">
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-7 w-7 rounded bg-signal-amber flex items-center justify-center">
            <span className="font-heading text-xs font-bold text-ink-navy">SS</span>
          </div>
          <div className="leading-tight">
            <h1 className="font-heading text-sm font-semibold text-paper">SoundScout Venue Planner</h1>
            <p className="text-[11px] text-slate">Speaker &amp; delay-tower placement assistant</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto flex-1 min-w-[240px]" aria-label="Workflow steps">
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
                  'rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors border',
                  isCurrent
                    ? 'bg-signal-amber text-ink-navy border-signal-amber'
                    : isDone
                    ? 'bg-circuit-teal/15 text-circuit-teal border-circuit-teal/40 hover:bg-circuit-teal/25'
                    : 'text-slate border-slate/20',
                  isReachable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                ].join(' ')}
              >
                {i + 1}. {s.label}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-1.5 text-xs text-slate">
            Air temp
            <input
              type="number"
              value={temperatureC}
              onChange={(e) => onTemperatureChange(Number(e.target.value))}
              className="data-value w-14 rounded border border-slate/30 bg-paper/5 px-1.5 py-1 text-xs text-paper focus:border-signal-amber focus:outline-none"
              step={1}
            />
            °C
          </label>
          {temperatureC !== DEFAULT_TEMPERATURE_C && (
            <button
              type="button"
              onClick={() => onTemperatureChange(DEFAULT_TEMPERATURE_C)}
              className="text-[11px] text-slate hover:text-paper underline underline-offset-2"
            >
              reset
            </button>
          )}

          {hasImage && (
            <button
              type="button"
              onClick={onReset}
              className="rounded border border-slate/30 px-2.5 py-1 text-xs text-slate hover:border-signal-amber hover:text-signal-amber transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
