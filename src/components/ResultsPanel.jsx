import { useState } from 'react'
import Button from './Button'
import InfraPlanImport from './InfraPlanImport'
import { comparePlanToSuggestions } from '../utils/infraPlan'

function buildSummaryText({ calibration, suggestions, temperatureC, stageDimensionsMeters, planMatch }) {
  const lines = [
    'SoundScout Venue Planner — Placement Summary',
    '',
    `Scale: ${calibration.metersPerPixel.toFixed(4)} m/px`,
    `Air temperature: ${temperatureC}°C  (speed of sound: ${suggestions.speedOfSoundMs.toFixed(1)} m/s)`,
  ]
  if (stageDimensionsMeters) {
    lines.push(`Stage footprint: ${stageDimensionsMeters.width.toFixed(1)}m × ${stageDimensionsMeters.depth.toFixed(1)}m`)
  }
  lines.push(`Crowd depth: ${suggestions.crowdDepthMeters.toFixed(1)}m`, '')

  if (suggestions.needsSplitHangs) {
    lines.push(
      `Main PA: SPLIT Left/Right hangs (crowd needs ~${suggestions.coverageAngleDeg.toFixed(0)}° coverage — beyond a single hang's ~100° range)`
    )
    suggestions.mainPAs.forEach((hang) => lines.push(`  ${hang.side.toUpperCase()}: (${hang.x.toFixed(0)}, ${hang.y.toFixed(0)}) px`))
  } else {
    lines.push(`Main PA: (${suggestions.mainPA.x.toFixed(0)}, ${suggestions.mainPA.y.toFixed(0)}) px — single hang covers the crowd's ~${suggestions.coverageAngleDeg.toFixed(0)}° width`)
  }
  lines.push(`Holds even level (within 6dB) out to ${suggestions.mainCoverage.sixDbPointM.toFixed(0)}m before reinforcement is needed`)

  if (suggestions.delayTowers.length === 0) {
    lines.push('', 'No delay towers required — the crowd fits within the main PA\'s own 6dB-even coverage throw.')
  } else {
    suggestions.delayTowers.forEach((t, i) => {
      lines.push(
        '',
        `Delay Tower ${i + 1}: ${t.distanceMeters.toFixed(1)}m from Main PA (${t.splDeltaDb.toFixed(1)} dB vs. front-of-crowd reference)`,
        `  Recommended delay: ${t.recommendedDelayMs.toFixed(1)} ms`,
        `  (${t.formula.baseDelay}; +15ms Haas offset)`
      )
    })
  }
  lines.push('', 'AI-assisted placement suggestions — planning starting point, not a certified acoustic design.')
  return lines.join('\n')
}

export default function ResultsPanel({ calibration, suggestions, temperatureC, stageRef, stageDimensionsMeters }) {
  const [copyState, setCopyState] = useState('idle') // idle | copied | error
  const [planCounts, setPlanCounts] = useState(null)
  const planMatch = planCounts ? comparePlanToSuggestions(planCounts, suggestions) : null

  if (!suggestions) {
    return (
      <aside className="w-full shrink-0 border-t border-gray-200 bg-gray-50/60 p-4 text-xs text-gray-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 sm:w-80 sm:border-l sm:border-t-0">
        Finish the stage and crowd-area steps to see placement suggestions here.
      </aside>
    )
  }

  const handleDownloadImage = () => {
    const stage = stageRef.current
    if (!stage) return
    const dataUrl = stage.toDataURL({ pixelRatio: 2 })
    const link = document.createElement('a')
    link.download = 'soundscout-venue-plan.png'
    link.href = dataUrl
    link.click()
  }

  const handleCopySummary = async () => {
    const text = buildSummaryText({ calibration, suggestions, temperatureC, stageDimensionsMeters })
    try {
      await navigator.clipboard.writeText(text)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
    setTimeout(() => setCopyState('idle'), 2000)
  }

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-t border-gray-200 bg-gray-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/60 sm:w-80 sm:border-l sm:border-t-0">
      <div>
        <h2 className="font-display text-sm font-semibold text-gray-900 dark:text-white">Placement Summary</h2>
        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-zinc-400">Auto-generated from your stage and crowd inputs.</p>
      </div>

      <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
        <dt className="text-gray-500 dark:text-zinc-400">Scale</dt>
        <dd className="data-value text-right text-gray-900 dark:text-white">{calibration.metersPerPixel.toFixed(4)} m/px</dd>
        <dt className="text-gray-500 dark:text-zinc-400">Air temp</dt>
        <dd className="data-value text-right text-gray-900 dark:text-white">{temperatureC}°C</dd>
        <dt className="text-gray-500 dark:text-zinc-400">Speed of sound</dt>
        <dd className="data-value text-right text-gray-900 dark:text-white">{suggestions.speedOfSoundMs.toFixed(1)} m/s</dd>
        {stageDimensionsMeters && (
          <>
            <dt className="text-gray-500 dark:text-zinc-400">Stage footprint</dt>
            <dd className="data-value text-right text-gray-900 dark:text-white">
              {stageDimensionsMeters.width.toFixed(1)} × {stageDimensionsMeters.depth.toFixed(1)} m
            </dd>
          </>
        )}
        <dt className="text-gray-500 dark:text-zinc-400">Crowd depth</dt>
        <dd className="data-value text-right text-gray-900 dark:text-white">{suggestions.crowdDepthMeters.toFixed(1)} m</dd>
        <dt className="text-gray-500 dark:text-zinc-400">Coverage angle</dt>
        <dd className="data-value text-right text-gray-900 dark:text-white">{suggestions.coverageAngleDeg.toFixed(0)}°</dd>
      </dl>

      <div className="rounded-lg border border-emerald-600/20 bg-white p-3 shadow-sm dark:bg-zinc-950">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-xs font-semibold text-emerald-600">{suggestions.needsSplitHangs ? 'Main PA — Split L/R' : 'Main PA'}</p>
        </div>
        {suggestions.needsSplitHangs ? (
          <>
            <p className="mt-1 text-[10.5px] text-gray-500 dark:text-zinc-400">
              Crowd needs ~{suggestions.coverageAngleDeg.toFixed(0)}° of coverage — wider than a single hang's usable range (~100°), so it's split
              into two hangs at the stage edges.
            </p>
            {suggestions.mainPAs.map((hang) => (
              <p key={hang.side} className="data-value mt-1 text-[11px] text-gray-500 dark:text-zinc-400">
                {hang.side.toUpperCase()} — x: {hang.x.toFixed(0)}px, y: {hang.y.toFixed(0)}px
              </p>
            ))}
          </>
        ) : (
          <p className="data-value mt-1 text-[11px] text-gray-500 dark:text-zinc-400">
            x: {suggestions.mainPA.x.toFixed(0)}px, y: {suggestions.mainPA.y.toFixed(0)}px
          </p>
        )}
        <p className="mt-1.5 border-t border-emerald-600/10 pt-1.5 text-[10.5px] text-gray-500 dark:text-zinc-400">
          Holds even level (within 6dB) out to <span className="data-value">{suggestions.mainCoverage.sixDbPointM.toFixed(0)}m</span> — the inverse-square
          law's "doubling distance" from its {suggestions.mainCoverage.nearM.toFixed(0)}m design throw.
        </p>
        {planMatch?.mainSummary && <PlanMatchLine text={planMatch.mainSummary} ok={planMatch.mainOk} />}
      </div>

      {suggestions.delayTowers.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          No delay towers needed — the crowd fits within the main PA's own 6dB-even coverage throw.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {suggestions.delayTowers.map((tower, i) => (
            <div key={tower.id} className="rounded-lg border border-cyan-600/20 bg-white p-3 shadow-sm dark:bg-zinc-950">
              <div className="flex items-baseline justify-between">
                <p className="font-display text-xs font-semibold text-cyan-600">Delay Tower {i + 1}</p>
                <p className="data-value text-sm font-semibold text-gray-900 dark:text-white">{tower.recommendedDelayMs.toFixed(1)} ms</p>
              </div>
              <p className="data-value mt-1.5 text-[10.5px] leading-relaxed text-gray-500 dark:text-zinc-400">
                {tower.formula.distance}
                <br />
                {tower.formula.baseDelay}
                <br />
                {tower.formula.recommended}
              </p>
              <p className="data-value mt-1.5 border-t border-cyan-600/10 pt-1.5 text-[10.5px] text-gray-500 dark:text-zinc-400">
                {tower.formula.spl} — {tower.splDeltaDb.toFixed(1)}dB vs. the front-of-crowd reference is why this position needs reinforcement.
              </p>
            </div>
          ))}
          {planMatch?.delaySummary && (
            <div className="px-1">
              <PlanMatchLine text={planMatch.delaySummary} ok={planMatch.delayOk} />
            </div>
          )}
        </div>
      )}

      <InfraPlanImport planCounts={planCounts} onPlanParsed={setPlanCounts} onClear={() => setPlanCounts(null)} />

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <Button onClick={handleDownloadImage}>Download as Image</Button>
        <Button variant="outline" onClick={handleCopySummary}>
          {copyState === 'copied' ? 'Copied ✓' : copyState === 'error' ? 'Copy failed — select manually' : 'Copy Summary'}
        </Button>
      </div>
    </aside>
  )
}

function PlanMatchLine({ text, ok }) {
  return <p className={`text-[10.5px] font-medium ${ok ? 'text-emerald-600' : 'text-amber-600'}`}>{ok ? '✓' : '⚠'} {text}</p>
}
