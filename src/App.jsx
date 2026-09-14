import { ThemeProvider } from './context/ThemeContext'
import AuthGate from './components/AuthGate'
import Planner from './pages/Planner'

export default function App() {
  return (
    <ThemeProvider>
      <AuthGate>{() => <Planner />}</AuthGate>
    </ThemeProvider>
  )
}
