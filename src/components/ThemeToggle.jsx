import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle({ className = '' }) {
  const { toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-all duration-300 hover:bg-gray-50 hover:text-cyan-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white ${className}`}
      aria-label="Toggle dark mode"
    >
      <div className="relative h-5 w-5">
        <Sun size={20} className="absolute inset-0 rotate-0 scale-100 text-amber-500 transition-all duration-300 ease-out dark:-rotate-90 dark:scale-0" />
        <Moon size={20} className="absolute inset-0 rotate-90 scale-0 text-cyan-600 transition-all duration-300 ease-out dark:rotate-0 dark:scale-100" />
      </div>
    </button>
  )
}
