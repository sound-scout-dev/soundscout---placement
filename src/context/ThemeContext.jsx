import { createContext, useContext, useState, useEffect } from 'react'

// Same pattern as the main sound-scout-frontend app's ThemeContext, so this
// tool's light/dark behavior feels identical — just its own storage key
// since it's a separate app/origin.
const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem('soundscout-planner.theme')
      return stored === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    try {
      localStorage.setItem('soundscout-planner.theme', theme)
    } catch {
      // Ignore storage errors (private browsing, etc.)
    }
  }, [theme])

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))

  return <ThemeContext.Provider value={{ theme, isDarkMode: theme === 'dark', toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
