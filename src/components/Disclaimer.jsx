// Persistent, always-visible disclaimer — deliberately not tucked away in a
// tooltip or footer. Styled as an informational note (cyan, matching how the
// main platform marks AI/interactive features) rather than a warning.
export default function Disclaimer() {
  return (
    <div className="border-b border-cyan-600/20 bg-cyan-600/5 px-4 py-1.5 text-center">
      <p className="text-xs text-cyan-700 dark:text-cyan-400">
        AI-assisted placement suggestions — intended as a planning starting point, not a certified acoustic design.
      </p>
    </div>
  )
}
