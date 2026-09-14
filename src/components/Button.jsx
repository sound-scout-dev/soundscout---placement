// Same variant system as the main platform's Button.jsx, so buttons in this
// tool behave and read identically to buttons everywhere else in SoundScout.
const VARIANTS = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 font-semibold shadow-sm',
  secondary: 'bg-cyan-600 text-white hover:bg-cyan-700 active:bg-cyan-800 disabled:bg-slate-200 disabled:text-slate-400 font-semibold shadow-sm',
  outline:
    'bg-transparent text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900 active:bg-slate-100 disabled:border-slate-100 disabled:text-slate-300',
  ghost: 'bg-transparent text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-white active:bg-slate-100 disabled:text-slate-300',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

export default function Button({ as: Component = 'button', variant = 'primary', size = 'md', className = '', disabled = false, ...props }) {
  return (
    <Component
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded font-medium transition-colors duration-150 ease-out
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600
        disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  )
}
