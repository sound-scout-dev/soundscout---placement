// Thin client for the sound-scout-ai Flask microservice's venue-analysis
// helper. Configure via VITE_AI_SERVICE_URL (defaults to the service's local
// dev port) once this tool is deployed alongside the rest of the platform.
const AI_SERVICE_URL = (import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '')

/**
 * Sends the raw uploaded venue photo to the AI service and gets back both
 * an estimated real-world scale AND a suggested stage placement — no
 * vendor-drawn reference line needed. Both are SUGGESTIONS: the caller
 * still shows the reasoning/confidence and lets the vendor edit the scale
 * or redraw the stage box themselves before anything is treated as final.
 */
export async function analyzeVenuePhoto(imageUrl) {
  const blob = await (await fetch(imageUrl)).blob()
  const form = new FormData()
  form.append('image', blob, 'venue.jpg')

  const res = await fetch(`${AI_SERVICE_URL}/api/analyze-venue-photo`, {
    method: 'POST',
    body: form,
  })

  const data = await res.json().catch(() => null)
  if (!res.ok || !data || data.error) {
    throw new Error(data?.error || `AI service responded with status ${res.status}`)
  }
  return data // { meters_per_pixel, scale_reasoning, scale_confidence, stage_box: {x1,y1,x2,y2} | null, stage_reasoning }
}
