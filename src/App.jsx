import AuthGate from './components/AuthGate'
import Planner from './pages/Planner'

export default function App() {
  return <AuthGate>{() => <Planner />}</AuthGate>
}
