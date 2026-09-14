// Same wave-and-dial mark and colors as the main sound-scout-frontend
// Logo.jsx, so this stays recognizably the same product family. Only the
// tagline differs (this tool isn't the whole "AUDIO LOGISTICS" platform).
export default function Logo({ dark = true, compact = false, className = '' }) {
  const textColor = dark ? 'text-slate-900 dark:text-white' : 'text-white'

  return (
    <div className={`flex items-center gap-2 sm:gap-2.5 ${className}`}>
      <svg className="h-5.5 w-7 sm:h-7.5 sm:w-9" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M 5 30 Q 12 25 15 20 Q 18 10 21 30 Q 24 50 27 15 Q 30 -10 33 35 Q 36 65 39 30 T 45 30 H 52"
          stroke="#0891B2"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="62" cy="30" r="18" stroke="#059669" strokeWidth="3.2" strokeDasharray="80 30" strokeLinecap="round" transform="rotate(-45 62 30)" />
        <line x1="62" y1="30" x2="72" y2="20" stroke="#0891B2" strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      <div className="flex flex-col leading-none">
        <span className={`font-display text-[11px] font-extrabold uppercase tracking-wider sm:text-[12.5px] ${textColor}`}>
          SOUNDSCOUT <span className="text-emerald-600">AI</span>
        </span>
        {!compact && (
          <span className="mt-0.5 hidden font-mono text-[6.5px] font-bold uppercase tracking-[0.2em] text-cyan-600 sm:inline">
            VENUE PLANNER
          </span>
        )}
      </div>
    </div>
  )
}
