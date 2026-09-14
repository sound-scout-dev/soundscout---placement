import { ThemeProvider } from './context/ThemeContext'
import AuthGate from './components/AuthGate'
import Planner from './pages/Planner'

export default function App() {
  return (
    <ThemeProvider>
      <AuthGate>{(vendorName, onLogout) => <Planner vendorName={vendorName} onLogout={onLogout} />}</AuthGate>
    </ThemeProvider>
  )
}
