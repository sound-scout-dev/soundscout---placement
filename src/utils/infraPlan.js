// utils/infraPlan.js
//
// Reads the equipment plan SoundScout AI's main platform already generates
// for an event (the LangGraph pipeline's `budget_plan` / `premium_plan` —
// each a flat list of free-text equipment strings, e.g.
// "4x JBL VTX A12 Line Array Speakers") and gives a best-effort count of how
// many are main-PA-type items vs. delay-speaker-type items, so the
// Planner's physics-based suggestions can be checked against what was
// actually budgeted for this event — not invented independently of it.
//
// This is necessarily a HEURISTIC: the plan is unstructured natural-language
// text (no explicit category/quantity fields), so classification is by
// keyword match and quantity is a regex-extracted leading number. Treat the
// counts as an approximate cross-check, not an authoritative equipment list.

const QUANTITY_PATTERN = /^\s*(\d+)\s*x?\s*/i
const DELAY_KEYWORDS = ['delay']
const MAIN_PA_KEYWORDS = ['speaker', 'line array', 'array', 'pa system', 'subwoofer', 'sub ', 'cluster', 'point source', 'loudspeaker']

function extractQuantity(text) {
  const match = text.match(QUANTITY_PATTERN)
  return match ? parseInt(match[1], 10) : 1
}

function classifyItem(text) {
  const lower = text.toLowerCase()
  if (DELAY_KEYWORDS.some((kw) => lower.includes(kw))) return 'delay'
  if (MAIN_PA_KEYWORDS.some((kw) => lower.includes(kw))) return 'main'
  return 'other'
}

/**
 * Classifies a flat list of equipment strings (one plan's worth) into main-
 * PA vs delay-speaker vs other, summing quantities within each category.
 */
export function classifyEquipmentItems(items) {
  const parsed = items
    .filter((item) => typeof item === 'string' && item.trim())
    .map((raw) => ({ raw, quantity: extractQuantity(raw), category: classifyItem(raw) }))

  const totalMainUnits = parsed.filter((i) => i.category === 'main').reduce((sum, i) => sum + i.quantity, 0)
  const totalDelayUnits = parsed.filter((i) => i.category === 'delay').reduce((sum, i) => sum + i.quantity, 0)

  return { items: parsed, totalMainUnits, totalDelayUnits }
}

/**
 * Accepts either the full JSON SoundScout AI's /api/generate returns (an
 * object with `budget_plan`/`premium_plan` arrays) or a plain newline-
 * separated list of equipment lines pasted directly, and returns the
 * classification for the requested plan (or the pasted list either way).
 * Throws with a friendly message on unusable input.
 */
export function parseInfraPlanInput(rawText, planChoice = 'premium') {
  const trimmed = rawText.trim()
  if (!trimmed) throw new Error('Paste the plan JSON or an equipment list first.')

  let items = null

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      items = parsed
    } else if (parsed && typeof parsed === 'object') {
      const key = planChoice === 'budget' ? 'budget_plan' : 'premium_plan'
      if (Array.isArray(parsed[key])) items = parsed[key]
      else if (Array.isArray(parsed.budget_plan)) items = parsed.budget_plan
      else if (Array.isArray(parsed.premium_plan)) items = parsed.premium_plan
    }
  } catch {
    // Not JSON — fall through to plain-text line parsing below.
  }

  if (!items) {
    items = trimmed
      .split('\n')
      .map((line) => line.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean)
  }

  if (items.length === 0) {
    throw new Error("Couldn't find any equipment items in that — paste the plan JSON or one item per line.")
  }

  return classifyEquipmentItems(items)
}

/**
 * Compares the physics-based suggestion counts against a parsed plan and
 * produces the short, honest, human-readable lines the results panel shows.
 * Intentionally humble about main-PA matching (a "hang" can be several
 * physical boxes, so an exact count match isn't meaningful) — the delay
 * comparison is the more directly actionable one.
 */
export function comparePlanToSuggestions(planCounts, suggestions) {
  if (!planCounts || !suggestions) return null

  const neededHangs = suggestions.mainPAs?.length ?? 2
  const mainOk = planCounts.totalMainUnits > 0
  const mainSummary = mainOk
    ? `Plan includes ${planCounts.totalMainUnits} main-PA-type item(s) — enough to split across the ${neededHangs} suggested Left/Right hangs.`
    : "Plan doesn't list any main-PA-type equipment (speakers/line arrays) — add some before relying on this placement."

  const neededDelays = suggestions.delayTowers.length
  let delayOk = true
  let delaySummary = null
  if (neededDelays > 0) {
    delayOk = planCounts.totalDelayUnits >= neededDelays
    delaySummary = delayOk
      ? `Plan includes ${planCounts.totalDelayUnits} delay-speaker item(s) — covers the ${neededDelays} suggested tower position(s).`
      : `Physics suggests ${neededDelays} delay tower position(s), but the plan only includes ${planCounts.totalDelayUnits} delay-speaker item(s) — the back of the crowd may be under-covered unless more are added.`
  } else if (planCounts.totalDelayUnits > 0) {
    delaySummary = `Plan includes ${planCounts.totalDelayUnits} delay-speaker item(s), but this crowd doesn't need any — may be more than necessary here.`
    delayOk = true
  }

  return { mainOk, mainSummary, delayOk, delaySummary }
}
