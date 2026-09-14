import { ArrowLeft } from 'lucide-react'
import Button from './Button'

export default function StepInstructions({ step, stage, crowd, onBack, onConfirmStage, onUndoCrowdPoint, onClearCrowd, onFinishCrowd, onClearStage }) {
  if (step === 'stage') {
    const hasBox = stage?.x != null
    const isEditing = hasBox && !stage.locked

    if (isEditing) {
      return (
        <Bar>
          <BackButton onBack={onBack} />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Instruction>
                {stage.suggested ? 'AI suggested a stage placement. ' : ''}
                Drag to move, corner handles to resize, top handle to rotate.
              </Instruction>
              <Button size="sm" onClick={onConfirmStage}>
                {stage.suggested ? 'Accept This Placement' : 'Confirm Stage Placement'}
              </Button>
              <Button variant="outline" size="sm" onClick={onClearStage}>
                Clear &amp; Redraw
              </Button>
            </div>
            {stage.reasoning && (
              <p className="text-[11px] text-cyan-700 dark:text-cyan-400">
                <span className="font-semibold uppercase tracking-wide">Why here:</span> {stage.reasoning}
              </p>
            )}
          </div>
        </Bar>
      )
    }

    return (
      <Bar>
        <BackButton onBack={onBack} />
        <Instruction>Click one corner of the stage area, then click the opposite corner to draw the box.</Instruction>
      </Bar>
    )
  }

  if (step === 'crowd') {
    const count = crowd?.points?.length ?? 0
    return (
      <Bar>
        <BackButton onBack={onBack} />
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

  if (step === 'results') {
    return (
      <Bar>
        <BackButton onBack={onBack} />
        <Instruction>Review the suggestions below, export them, or go back to adjust anything.</Instruction>
      </Bar>
    )
  }

  return null
}

function BackButton({ onBack }) {
  if (!onBack) return null
  return (
    <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0 gap-1 pl-2">
      <ArrowLeft size={13} strokeWidth={2} />
      Back
    </Button>
  )
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
