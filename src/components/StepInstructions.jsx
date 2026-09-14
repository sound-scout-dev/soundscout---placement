import { useState } from 'react'

const baseBtn =
  'rounded px-3 py-1.5 text-xs font-medium transition-colors border disabled:opacity-40 disabled:cursor-not-allowed'
const primaryBtn = `${baseBtn} bg-signal-amber text-ink-navy border-signal-amber hover:bg-signal-amber/90`
const ghostBtn = `${baseBtn} border-slate/30 text-slate hover:text-paper hover:border-paper/40`

export default function StepInstructions({ step, calibration, crowd, onConfirmDistance, onUndoCrowdPoint, onClearCrowd, onFinishCrowd, onRestartStage }) {
  const [distanceDraft, setDistanceDraft] = useState('')

  if (step === 'calibrate') {
    const awaitingDistance = calibration?.a && calibration?.b && !calibration?.locked
    return (
      <Bar>
        {!calibration?.a && <Instruction>Click one end of an object with a known real-world length (e.g. a fence line).</Instruction>}
        {calibration?.a && !calibration?.b && <Instruction>Now click the other end of that same object.</Instruction>}
        {awaitingDistance && (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const meters = Number(distanceDraft)
              if (meters > 0) {
                onConfirmDistance(meters)
                setDistanceDraft('')
              }
            }}
          >
            <Instruction as="label">Real-world distance between those two points:</Instruction>
            <input
              autoFocus
              type="number"
              min="0.1"
              step="0.1"
              value={distanceDraft}
              onChange={(e) => setDistanceDraft(e.target.value)}
              placeholder="e.g. 40"
              className="data-value w-20 rounded border border-slate/30 bg-paper/5 px-2 py-1 text-xs text-paper focus:border-signal-amber focus:outline-none"
            />
            <span className="text-xs text-slate">meters</span>
            <button type="submit" className={primaryBtn} disabled={!distanceDraft}>
              Confirm Scale
            </button>
          </form>
        )}
      </Bar>
    )
  }

  if (step === 'stage') {
    return (
      <Bar>
        <Instruction>Click to place the stage, then click again in the direction it faces.</Instruction>
        <button type="button" className={ghostBtn} onClick={onRestartStage}>
          Redo Placement
        </button>
      </Bar>
    )
  }

  if (step === 'crowd') {
    const count = crowd?.points?.length ?? 0
    return (
      <Bar>
        <Instruction>Click to outline the crowd area ({count} point{count === 1 ? '' : 's'} placed, minimum 3).</Instruction>
        <button type="button" className={ghostBtn} onClick={onUndoCrowdPoint} disabled={count === 0}>
          Undo Point
        </button>
        <button type="button" className={ghostBtn} onClick={onClearCrowd} disabled={count === 0}>
          Clear
        </button>
        <button type="button" className={primaryBtn} onClick={onFinishCrowd} disabled={count < 3}>
          Finish Area →
        </button>
      </Bar>
    )
  }

  return null
}

function Bar({ children }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate/20 bg-paper/[0.04] px-4 py-2.5 sm:px-6">
      {children}
    </div>
  )
}

function Instruction({ children, as: As = 'p' }) {
  return <As className="text-xs text-paper/90">{children}</As>
}
