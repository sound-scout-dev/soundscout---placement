// Thin client for the sound-scout-ai Flask microservice's calibration
// helper. Configure via VITE_AI_SERVICE_URL (defaults to the service's local
// dev port) once this tool is deployed alongside the rest of the platform.
const AI_SERVICE_URL = (import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '')

/**
 * Sends a snapshot of the canvas (the venue photo with the calibration line
 * drawn on it) to the AI service and asks it to estimate the real-world
 * distance the line represents. Returns a SUGGESTION only — callers must
 * still let the vendor confirm or edit the value before using it.
 */
export async function estimateScaleFromPhoto(canvasDataUrl) {
  const blob = await (await fetch(canvasDataUrl)).blob()
  const form = new FormData()
  form.append('image', blob, 'calibration.png')

  const res = await fetch(`${AI_SERVICE_URL}/api/estimate-scale`, {
    method: 'POST',
    body: form,
  })

  const data = await res.json().catch(() => null)
  if (!res.ok || !data || data.error) {
    throw new Error(data?.error || `AI service responded with status ${res.status}`)
  }
  return data // { estimated_meters, reasoning, confidence }
}
