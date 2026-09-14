import { useState } from 'react'
import { ClipboardPaste, X } from 'lucide-react'
import Button from './Button'
import { parseInfraPlanInput } from '../utils/infraPlan'

// Lets the vendor paste the equipment plan SoundScout AI's main platform
// already generated for this event (the /api/generate response JSON, or
// just a plain equipment list) so the placement suggestions below can be
// checked against what was actually budgeted — not invented independently.
export default function InfraPlanImport({ planCounts, onPlanParsed, onClear }) {
  const [expanded, setExpanded] = useState(false)
  const [planChoice, setPlanChoice] = useState('premium')
  const [rawText, setRawText] = useState('')
  const [error, setError] = useState(null)

  const handleApply = () => {
    try {
      const counts = parseInfraPlanInput(rawText, planChoice)
      setError(null)
      onPlanParsed(counts)
      setExpanded(false)
      setRawText('')
    } catch (err) {
      setError(err.message)
    }
  }

  if (!expanded) {
    if (planCounts) {
      return (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <span className="text-gray-600 dark:text-zinc-300">
            Matched to plan — {planCounts.totalMainUnits} main, {planCounts.totalDelayUnits} delay item(s)
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setExpanded(true)} className="font-semibold text-cyan-600 hover:underline">
              Edit
            </button>
            <button type="button" onClick={onClear} aria-label="Remove imported plan" className="text-gray-400 hover:text-red-500">
              <X size={13} strokeWidth={2} />
            </button>
          </div>
        </div>
      )
    }
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-[11px] font-medium text-gray-500 shadow-sm hover:border-cyan-600 hover:text-cyan-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400"
      >
        <ClipboardPaste size={13} strokeWidth={2} />
        Match to Infrastructure Plan
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="font-display text-xs font-semibold text-gray-900 dark:text-white">Match to Infrastructure Plan</p>
      <p className="mt-1 text-[10.5px] text-gray-500 dark:text-zinc-400">
        Paste the equipment plan SoundScout AI generated for this event — the full JSON, or just an equipment list, one item per line.
      </p>

      <div className="mt-2 flex gap-3 text-[11px]">
        <label className="flex items-center gap-1.5 text-gray-600 dark:text-zinc-300">
          <input type="radio" name="planChoice" checked={planChoice === 'budget'} onChange={() => setPlanChoice('budget')} />
          Budget Plan
        </label>
        <label className="flex items-center gap-1.5 text-gray-600 dark:text-zinc-300">
          <input type="radio" name="planChoice" checked={planChoice === 'premium'} onChange={() => setPlanChoice('premium')} />
          Premium Plan
        </label>
      </div>

      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        rows={5}
        placeholder={'Paste plan JSON, or:\n4x Line Array Speakers\n2x Delay Speakers\n...'}
        className="data-value mt-2 w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-[11px] text-gray-900 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
      />
      {error && <p className="mt-1.5 text-[10.5px] text-red-500">{error}</p>}

      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={handleApply} disabled={!rawText.trim()}>
          Match
        </Button>
        <Button variant="outline" size="sm" onClick={() => setExpanded(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
