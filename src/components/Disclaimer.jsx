// Persistent, always-visible disclaimer — deliberately not tucked away in a
// tooltip or footer. The tool assists a vendor's judgment; it should never
// read as an authoritative black box.
export default function Disclaimer() {
  return (
    <div className="bg-signal-amber/10 border-b border-signal-amber/30 px-4 py-1.5 text-center">
      <p className="text-xs text-signal-amber/90 font-body">
        AI-assisted placement suggestions — intended as a planning starting point, not a certified acoustic design.
      </p>
    </div>
  )
}
