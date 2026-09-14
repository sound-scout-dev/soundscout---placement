import { useState } from 'react'

function buildSummaryText({ calibration, suggestions, temperatureC }) {
  const lines = [
    'SoundScout Venue Planner — Placement Summary',
    '',
    `Scale: ${calibration.metersPerPixel.toFixed(4)} m/px (calibrated from a ${calibration.realDistanceMeters}m reference)`,
    `Air temperature: ${temperatureC}°C  (speed of sound: ${suggestions.speedOfSoundMs.toFixed(1)} m/s)`,
    `Crowd depth: ${suggestions.crowdDepthMeters.toFixed(1)}m`,
    '',
    `Main PA: (${suggestions.mainPA.x.toFixed(0)}, ${suggestions.mainPA.y.toFixed(0)}) px`,
  ]
  if (suggestions.delayTowers.length === 0) {
    lines.push('', 'No delay towers required — crowd depth is within single-PA coverage at default 35m spacing.')
  } else {
    suggestions.delayTowers.forEach((t, i) => {
      lines.push(
        '',
        `Delay Tower ${i + 1}: ${t.distanceMeters.toFixed(1)}m from Main PA`,
        `  Recommended delay: ${t.recommendedDelayMs.toFixed(1)} ms`,
        `  (${t.formula.baseDelay}; +15ms Haas offset)`
      )
    })
  }
  lines.push('', 'AI-assisted placement suggestions — planning starting point, not a certified acoustic design.')
  return lines.join('\n')
}

export default function ResultsPanel({ calibration, suggestions, temperatureC, stageRef }) {
  const [copyState, setCopyState] = useState('idle') // idle | copied | error

  if (!suggestions) {
    return (
      <aside className="w-full shrink-0 border-t border-slate/20 bg-paper/[0.03] p-4 text-xs text-slate sm:w-80 sm:border-l sm:border-t-0">
        Finish the calibration, stage, and crowd-area steps to see placement suggestions here.
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
    const text = buildSummaryText({ calibration, suggestions, temperatureC })
    try {
      await navigator.clipboard.writeText(text)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
    setTimeout(() => setCopyState('idle'), 2000)
  }

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-t border-slate/20 bg-paper/[0.03] p-4 sm:w-80 sm:border-l sm:border-t-0">
      <div>
        <h2 className="font-heading text-sm font-semibold">Placement Summary</h2>
        <p className="mt-0.5 text-[11px] text-slate">Auto-generated from your calibration, stage, and crowd inputs.</p>
      </div>

      <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
        <dt className="text-slate">Scale</dt>
        <dd className="data-value text-right text-paper">{calibration.metersPerPixel.toFixed(4)} m/px</dd>
        <dt className="text-slate">Air temp</dt>
        <dd className="data-value text-right text-paper">{temperatureC}°C</dd>
        <dt className="text-slate">Speed of sound</dt>
        <dd className="data-value text-right text-paper">{suggestions.speedOfSoundMs.toFixed(1)} m/s</dd>
        <dt className="text-slate">Crowd depth</dt>
        <dd className="data-value text-right text-paper">{suggestions.crowdDepthMeters.toFixed(1)} m</dd>
      </dl>

      <div className="hairline rounded p-3">
        <p className="font-heading text-xs font-semibold text-signal-amber">Main PA</p>
        <p className="data-value mt-1 text-[11px] text-slate">
          x: {suggestions.mainPA.x.toFixed(0)}px, y: {suggestions.mainPA.y.toFixed(0)}px
        </p>
      </div>

      {suggestions.delayTowers.length === 0 ? (
        <p className="hairline rounded p-3 text-xs text-slate">
          No delay towers suggested — this crowd area fits within single-PA coverage at the default {' '}
          <span className="data-value">35m</span> ring spacing.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {suggestions.delayTowers.map((tower, i) => (
            <div key={tower.id} className="hairline rounded p-3">
              <div className="flex items-baseline justify-between">
                <p className="font-heading text-xs font-semibold text-circuit-teal">Delay Tower {i + 1}</p>
                <p className="data-value text-sm font-semibold text-paper">{tower.recommendedDelayMs.toFixed(1)} ms</p>
              </div>
              <p className="data-value mt-1.5 text-[10.5px] leading-relaxed text-slate">
                {tower.formula.distance}
                <br />
                {tower.formula.baseDelay}
                <br />
                {tower.formula.recommended}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={handleDownloadImage}
          className="rounded bg-signal-amber px-3 py-2 text-xs font-medium text-ink-navy hover:bg-signal-amber/90 transition-colors"
        >
          Download as Image
        </button>
        <button
          type="button"
          onClick={handleCopySummary}
          className="rounded border border-slate/30 px-3 py-2 text-xs font-medium text-paper hover:border-circuit-teal hover:text-circuit-teal transition-colors"
        >
          {copyState === 'copied' ? 'Copied ✓' : copyState === 'error' ? 'Copy failed — select manually' : 'Copy Summary'}
        </button>
      </div>
    </aside>
  )
}
