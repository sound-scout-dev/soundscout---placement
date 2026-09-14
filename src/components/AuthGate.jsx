import { useState } from 'react'

// PLACEHOLDER AUTH — this is a standalone-app stand-in only. Once this tool
// is properly linked to the main SoundScout AI platform, replace this with
// real shared authentication (e.g. an auth token passed via URL param from
// the Vendor Dashboard, or a shared session/SSO check), and remove the
// localStorage vendor-name shortcut below.
const STORAGE_KEY = 'soundscout-planner-vendor-name'

export default function AuthGate({ children }) {
  const [vendorName, setVendorName] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || ''
    } catch {
      return ''
    }
  })
  const [draft, setDraft] = useState('')

  if (vendorName) return children(vendorName)

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-navy px-4">
      <form
        className="w-full max-w-sm rounded border border-slate/20 bg-paper/[0.04] p-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (!draft.trim()) return
          try {
            localStorage.setItem(STORAGE_KEY, draft.trim())
          } catch {
            // localStorage unavailable — continue without persisting
          }
          setVendorName(draft.trim())
        }}
      >
        <div className="mx-auto mb-4 h-9 w-9 rounded bg-signal-amber flex items-center justify-center">
          <span className="font-heading text-sm font-bold text-ink-navy">SS</span>
        </div>
        <h1 className="text-center font-heading text-base font-semibold text-paper">SoundScout Venue Planner</h1>
        <p className="mt-1 text-center text-xs text-slate">Sign in to continue (placeholder — replace with platform login)</p>

        <label className="mt-5 block text-xs text-slate">
          Vendor name
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. Colombo Sound Co."
            className="mt-1 w-full rounded border border-slate/30 bg-paper/5 px-3 py-2 text-sm text-paper focus:border-signal-amber focus:outline-none"
          />
        </label>

        <button
          type="submit"
          className="mt-4 w-full rounded bg-signal-amber px-3 py-2 text-sm font-medium text-ink-navy hover:bg-signal-amber/90 transition-colors"
        >
          Continue
        </button>
      </form>
    </div>
  )
}
