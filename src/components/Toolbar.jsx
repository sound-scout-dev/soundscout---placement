import { LogOut } from 'lucide-react'
import { DEFAULT_TEMPERATURE_C } from '../utils/acoustics'
import Logo from './Logo'
import Button from './Button'
import ThemeToggle from './ThemeToggle'

// Mirrors the main platform's DashboardLayout header exactly (same
// container width/height/padding, role badge, greeting, logout button) —
// this tool's workflow steps live in their own WorkflowStepper below instead
// of cluttering this bar, same as the header/step-progress split the main
// app itself uses (DashboardLayout's header vs. NewEvent's WizardProgress).
export default function Toolbar({ temperatureC, onTemperatureChange, metersPerPixel, onMetersPerPixelChange, onReset, hasImage, vendorName, onLogout }) {
  return (
    <header
      className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/95 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/95"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-6 lg:px-8">
        <Logo compact className="shrink-0" />

        <div className="flex items-center gap-2 overflow-x-auto sm:gap-4">
          {metersPerPixel != null && (
            <label
              className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-400"
              title="AI-estimated scale — edit if you know the real-world scale better."
            >
              Scale
              <input
                type="number"
                min="0.0001"
                step="0.001"
                value={metersPerPixel}
                onChange={(e) => onMetersPerPixelChange(Number(e.target.value))}
                className="data-value w-16 rounded border border-gray-200 bg-white px-1.5 py-1 text-xs font-normal normal-case tracking-normal text-gray-900 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              />
              m/px
            </label>
          )}
          <label className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
            Air temp
            <input
              type="number"
              value={temperatureC}
              onChange={(e) => onTemperatureChange(Number(e.target.value))}
              className="data-value w-14 rounded border border-gray-200 bg-white px-1.5 py-1 text-xs font-normal normal-case tracking-normal text-gray-900 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              step={1}
            />
            °C
          </label>
          {temperatureC !== DEFAULT_TEMPERATURE_C && (
            <button
              type="button"
              onClick={() => onTemperatureChange(DEFAULT_TEMPERATURE_C)}
              className="shrink-0 text-[11px] text-gray-400 underline underline-offset-2 hover:text-cyan-600 dark:text-zinc-500"
            >
              reset
            </button>
          )}

          {hasImage && (
            <Button variant="outline" size="sm" className="shrink-0" onClick={onReset}>
              Start Over
            </Button>
          )}

          <span className="hidden shrink-0 rounded border border-gray-200 bg-gray-100/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-gray-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 md:inline-block">
            Vendor
          </span>

          {vendorName && (
            <span className="hidden shrink-0 font-body text-sm font-medium text-gray-500 dark:text-zinc-400 lg:inline">
              Hi, {vendorName.split(' ')[0]}
            </span>
          )}

          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            className="flex shrink-0 items-center gap-1.5 rounded px-1.5 py-1.5 text-sm font-medium text-gray-600 transition-colors duration-150 ease-out hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 dark:text-zinc-300 dark:hover:text-red-400 sm:px-2"
          >
            <LogOut size={14} strokeWidth={2} />
            <span className="hidden sm:inline">Log out</span>
          </button>

          <div className="shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
