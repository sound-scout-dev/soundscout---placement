import { useState } from 'react'
import Logo from './Logo'
import Button from './Button'

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

  const logout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // localStorage unavailable — nothing to clear
    }
    setVendorName('')
  }

  if (vendorName) return children(vendorName, logout)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-zinc-950">
      <form
        className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
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
        <div className="mb-5 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-center font-display text-base font-semibold text-gray-900 dark:text-white">Sign in to continue</h1>
        <p className="mt-1 text-center text-xs text-gray-500 dark:text-zinc-400">Placeholder auth — replace with platform login</p>

        <label className="mt-5 block">
          <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-400">Vendor name</span>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. Colombo Sound Co."
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm transition-all duration-150 ease-out placeholder:text-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          />
        </label>

        <Button type="submit" className="mt-4 w-full">
          Continue
        </Button>
      </form>
    </div>
  )
}
