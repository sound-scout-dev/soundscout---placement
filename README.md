# SoundScout Venue Planner

A standalone tool for sound/event vendors: upload a drone or venue photo and
get an AI-suggested stage placement plus main-PA and delay-tower placement
for outdoor concerts, with the delay time (ms) calculated per tower.

Companion app to the main **SoundScout AI** platform — built and hosted as
its own separate app for now (see `AuthGate.jsx` for the placeholder-auth
note on wiring it into the main platform's login later).

## How it works

1. **Upload** a JPG/PNG venue photo.
2. **Analyze** (automatic) — the photo is sent to the `sound-scout-ai`
   service, which estimates the image's real-world scale (meters-per-pixel)
   and suggests a rectangle for the stage, using visible reference objects
   (cars, doors, people, etc.) and basic placement judgment (flat open area,
   backed by a wall, open space in front for the crowd). No vendor-drawn
   reference line needed.
3. **Stage** — the AI's suggested box is shown as a dashed, labeled
   ("AI SUGGESTED") rectangle with its reasoning. Click **Accept This
   Placement** to confirm it, or **Draw My Own Instead** / just click two
   opposite corners on the photo to draw your own box.
4. **Mark the crowd area** — click to drop points around where the audience
   will stand (minimum 3), then "Finish Area." The sound-projection axis
   used for the suggestions below is derived automatically from stage
   center → crowd centroid — there's no separate "facing direction" input.
5. **Get suggestions** — a main PA position near the stage, plus delay
   towers spaced through the crowd using a standard outdoor-audio spacing
   heuristic, each with its recommended delay time and the formula used to
   get there (not just a bare number).
6. **Export** — download the annotated photo as an image, or copy a plain-text
   spec-sheet summary.

The scale and stage suggestion are just that — suggestions. The estimated
scale stays visible and editable in the toolbar ("Scale ... m/px") at every
step if you know better than the AI, and the stage box can always be
redrawn.

The core delay-tower math (`src/utils/acoustics.js`) is:

```
distance_meters      = pixel_distance_from_main_PA * meters_per_pixel
speed_of_sound        = 331.3 + 0.606 * temperature_celsius   // default 20°C
base_delay_ms         = (distance_meters / speed_of_sound) * 1000
recommended_delay_ms  = base_delay_ms + 15   // Haas-effect offset
```

Delay towers are only placed where they'd actually fall inside the drawn
crowd area (not in the gap between the stage and the crowd), spaced every
35m (`DELAY_RING_SPACING_M`), up to 4 towers.

**This tool gives planning suggestions, not a certified acoustic design** —
see the always-visible disclaimer in the app.

## Stack

- React 19 + Vite
- `react-konva` / `konva` for the interactive canvas (image, stage box,
  crowd polygon, suggestion overlay)
- Tailwind CSS, matching the main `sound-scout-frontend` app's actual design
  system: light-mode-default with a `.dark`-class dark mode toggle
  (`ThemeContext`/`ThemeToggle`, same as the main app), cyan `#0891B2` as the
  interactive accent, emerald `#059669` as the primary/confirmed color,
  `Space Grotesk` (`font-display`) + `Inter` (`font-body`) +
  `IBM Plex Mono` (`font-mono`, reserved for small uppercase labels and all
  numeric output)
- `lucide-react` icons, `Button`/`Logo` components mirroring the main app's
- Vitest for the placement/delay math (`src/utils/acoustics.test.js`)

## Project structure

```
src/
  components/   UI pieces (Toolbar, CanvasStage, AnalyzingOverlay, ResultsPanel, StepInstructions, AuthGate, Button, Logo, ThemeToggle, ...)
  context/      ThemeContext.jsx (light/dark, same pattern as the main app)
  pages/        Planner.jsx — the workflow state machine that ties it all together
  utils/        acoustics.js (math, unit-tested), aiService.js (calls sound-scout-ai), steps.js, useHtmlImage.js
```

## Run it

This app calls the `sound-scout-ai` Flask service for the automatic
photo analysis, so that needs to be running too:

```bash
# in sound-scout-ai/
python app.py            # runs on :8000 by default, needs GEMINI_API_KEY in .env

# in soundscout---placement/ (this app)
npm install
npm run dev               # start the dev server
npm test                  # run the acoustics unit tests
npm run build              # production build
npm run lint               # oxlint
```

Configure `VITE_AI_SERVICE_URL` in `.env.local` if the AI service isn't at
the default `http://localhost:8000` (see `.env.local.example`) — e.g. point
it at your deployed Render URL for anything beyond local dev.

## Known limitations / next steps

- Auth is a placeholder (vendor name stored in `localStorage`) — swap for
  real shared auth once linked to the main platform.
- The AI's scale and stage-placement estimates are inherently rough (no
  metadata, single 2D photo) — both stay visible/editable/redrawable rather
  than being applied silently, but treat them as a starting point.
- Crowd area supports a manually-clicked polygon (rectangle-by-4-clicks
  works fine); no drag-to-draw rectangle shortcut yet.
- Delay-tower lateral placement uses the crowd polygon's overall left/right
  center at every depth, rather than re-centering per ring — fine for
  roughly rectangular crowd areas, less precise for very irregular shapes.
