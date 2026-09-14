import Button from './Button'

export default function StepInstructions({ step, stage, crowd, onAcceptStageSuggestion, onUndoCrowdPoint, onClearCrowd, onFinishCrowd, onRestartStage }) {
  if (step === 'stage') {
    const hasUnconfirmedSuggestion = stage?.suggested && stage?.a && !stage?.locked

    if (hasUnconfirmedSuggestion) {
      return (
        <Bar>
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Instruction>AI suggested a stage placement — reviewing before you confirm.</Instruction>
              <Button size="sm" onClick={onAcceptStageSuggestion}>
                Accept This Placement
              </Button>
              <Button variant="outline" size="sm" onClick={onRestartStage}>
                Draw My Own Instead
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
        <Instruction>Click one corner of the stage area, then click the opposite corner to draw the box.</Instruction>
        {stage?.a && (
          <Button variant="outline" size="sm" onClick={onRestartStage}>
            Redo Placement
          </Button>
        )}
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
