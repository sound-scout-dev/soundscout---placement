import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import Button from './Button'

export default function StepInstructions({ step, calibration, crowd, onConfirmDistance, onRequestScaleEstimate, onUndoCrowdPoint, onClearCrowd, onFinishCrowd, onRestartStage }) {
  const [distanceDraft, setDistanceDraft] = useState('')
  const [aiState, setAiState] = useState('idle') // idle | loading | error
  const [aiNote, setAiNote] = useState(null) // { reasoning, confidence } once a suggestion lands

  if (step === 'calibrate') {
    const awaitingDistance = calibration?.a && calibration?.b && !calibration?.locked

    const handleAskAi = async () => {
      setAiState('loading')
      setAiNote(null)
      try {
        const result = await onRequestScaleEstimate()
        setDistanceDraft(String(result.estimated_meters))
        setAiNote({ reasoning: result.reasoning, confidence: result.confidence })
        setAiState('idle')
      } catch (err) {
        setAiState('error')
        setAiNote({ error: err.message || 'Could not reach the AI service.' })
      }
    }

    return (
      <Bar>
        {!calibration?.a && <Instruction>Click one end of an object with a known real-world length (e.g. a fence line).</Instruction>}
        {calibration?.a && !calibration?.b && <Instruction>Now click the other end of that same object.</Instruction>}
        {awaitingDistance && (
          <div className="flex flex-1 flex-col gap-2">
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                const meters = Number(distanceDraft)
                if (meters > 0) {
                  onConfirmDistance(meters)
                  setDistanceDraft('')
                  setAiNote(null)
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
              <Button variant="outline" size="sm" onClick={handleAskAi} disabled={aiState === 'loading'} type="button">
                <Sparkles size={13} strokeWidth={2} />
                {aiState === 'loading' ? 'Estimating…' : 'Ask AI to Estimate'}
              </Button>
              <Button type="submit" size="sm" disabled={!distanceDraft}>
                Confirm Scale
              </Button>
            </form>
            {aiNote?.reasoning && (
              <p className="text-[11px] text-cyan-700 dark:text-cyan-400">
                <span className="font-semibold uppercase tracking-wide">AI estimate ({aiNote.confidence} confidence):</span> {aiNote.reasoning} — review before confirming.
              </p>
            )}
            {aiNote?.error && <p className="text-[11px] text-red-500">{aiNote.error} You can still enter the distance manually.</p>}
          </div>
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
