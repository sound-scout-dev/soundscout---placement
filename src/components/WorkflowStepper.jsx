import { UploadCloud, Sparkles, Speaker, Users, ClipboardCheck, Check } from 'lucide-react'
import { STEPS, stepIndex } from '../utils/steps'

// Same skeleton as the main platform's own new-event WizardProgress
// (numbered circle -> connecting line -> mono uppercase label, done steps
// turn emerald with a check, the active step turns cyan) — carried here as
// its own dedicated step UI instead of living in the header, with a couple
// of upgrades: a per-step icon instead of a bare digit, and a glowing/scaled
// active-step state.
const STEP_ICONS = {
  upload: UploadCloud,
  analyzing: Sparkles,
  stage: Speaker,
  crowd: Users,
  results: ClipboardCheck,
}

export default function WorkflowStepper({ step, furthestStep, onStepClick }) {
  const furthestIdx = stepIndex(furthestStep)

  return (
    <div className="border-b border-gray-200/60 bg-white px-4 py-4 dark:border-zinc-800/80 dark:bg-zinc-950 sm:px-6">
      <ol className="mx-auto flex max-w-2xl items-center">
        {STEPS.map((s, i) => {
          const Icon = STEP_ICONS[s.key]
          const isDone = i < furthestIdx
          const isActive = s.key === step
          const isReachable = i <= furthestIdx
          const state = isDone ? 'done' : isActive ? 'active' : 'upcoming'

          return (
            <li key={s.key} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                disabled={!isReachable}
                onClick={() => isReachable && onStepClick(s.key)}
                className={`flex flex-col items-center gap-1.5 ${isReachable ? 'group cursor-pointer' : 'cursor-not-allowed'}`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ease-out sm:h-10 sm:w-10 ${
                    state === 'done'
                      ? 'bg-emerald-600 text-white group-hover:bg-emerald-700'
                      : state === 'active'
                        ? 'scale-110 bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                        : 'bg-gray-150 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600'
                  }`}
                >
                  {state === 'done' ? <Check size={16} strokeWidth={3} /> : <Icon size={16} strokeWidth={2} />}
                </span>
                <span
                  className={`hidden font-mono text-[10px] font-bold uppercase tracking-widest transition-colors sm:block ${
                    state === 'upcoming' ? 'text-gray-400 dark:text-zinc-600' : 'text-gray-700 group-hover:text-cyan-600 dark:text-zinc-300'
                  }`}
                >
                  {s.label}
                </span>
              </button>
              {i !== STEPS.length - 1 && (
                <div className={`mx-2 mb-4 h-px flex-1 transition-colors duration-300 sm:mx-3 sm:mb-5 ${isDone ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-zinc-800'}`} />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
