import { useState } from 'react'
import Button from './Button'

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
              className="data-value w-20 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
            <span className="text-xs text-gray-500 dark:text-zinc-400">meters</span>
            <Button type="submit" size="sm" disabled={!distanceDraft}>
              Confirm Scale
            </Button>
          </form>
        )}
      </Bar>
    )
  }

  if (step === 'stage') {
    return (
      <Bar>
        <Instruction>Click to place the stage, then click again in the direction it faces.</Instruction>
        <Button variant="outline" size="sm" onClick={onRestartStage}>
          Redo Placement
        </Button>
      </Bar>
    )
  }

  if (step === 'crowd') {
    const count = crowd?.points?.length ?? 0
    return (
      <Bar>
        <Instruction>Click to outline the crowd area ({count} point{count === 1 ? '' : 's'} placed, minimum 3).</Instruction>
        <Button variant="outline" size="sm" onClick={onUndoCrowdPoint} disabled={count === 0}>
          Undo Point
        </Button>
        <Button variant="outline" size="sm" onClick={onClearCrowd} disabled={count === 0}>
          Clear
        </Button>
        <Button size="sm" onClick={onFinishCrowd} disabled={count < 3}>
          Finish Area →
        </Button>
      </Bar>
    )
  }

  return null
}

function Bar({ children }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-200/60 bg-gray-50/80 px-4 py-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/60 sm:px-6">
      {children}
    </div>
  )
}

function Instruction({ children, as: As = 'p' }) {
  return <As className="text-xs text-gray-600 dark:text-zinc-300">{children}</As>
}
