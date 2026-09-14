# SoundScout Venue Planner

A standalone tool for sound/event vendors: upload a drone or venue photo and
get suggested main-PA and delay-tower placement for outdoor concerts, with
the delay time (ms) calculated per tower.

Companion app to the main **SoundScout AI** platform — built and hosted as
its own separate app for now (see `AuthGate.jsx` for the placeholder-auth
note on wiring it into the main platform's login later).

## How it works

1. **Upload** a JPG/PNG venue photo.
2. **Calibrate** — draw a line on something of known real-world length (a
   fence, a building edge) and type in the distance in meters. This gives
   the whole image a meters-per-pixel scale.
3. **Place the stage** — click to place it, click again to set which way it
   faces.
4. **Mark the crowd area** — click to drop points around where the audience
   will stand (minimum 3), then "Finish Area."
5. **Get suggestions** — a main PA position near the stage, plus delay
   towers spaced through the crowd using a standard outdoor-audio spacing
   heuristic, each with its recommended delay time and the formula used to
   get there (not just a bare number).
6. **Export** — download the annotated photo as an image, or copy a plain-text
   spec-sheet summary.

The core math (`src/utils/acoustics.js`) is:

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
- `react-konva` / `konva` for the interactive canvas (image, calibration
  line, stage marker, crowd polygon, suggestion overlay)
- Tailwind CSS, using the shared SoundScout design tokens (`tailwind.config.js`):
  Ink Navy / Paper / Signal Amber / Circuit Teal / Slate, `Space Grotesk` +
  `Inter` + `IBM Plex Mono` (mono reserved for all numeric output)
- Vitest for the placement/delay math (`src/utils/acoustics.test.js`)

## Project structure

```
src/
  components/   UI pieces (Toolbar, CanvasStage, ResultsPanel, StepInstructions, AuthGate, ...)
  pages/        Planner.jsx — the workflow state machine that ties it all together
  utils/        acoustics.js (math, unit-tested), steps.js, useHtmlImage.js
```

## Run it

```bash
npm install
npm run dev       # start the dev server
npm test          # run the acoustics unit tests
npm run build     # production build
npm run lint       # oxlint
```

## Known limitations / next steps

- Auth is a placeholder (vendor name stored in `localStorage`) — swap for
  real shared auth once linked to the main platform.
- Crowd area supports a manually-clicked polygon (rectangle-by-4-clicks
  works fine); no drag-to-draw rectangle shortcut yet.
- Delay-tower lateral placement uses the crowd polygon's overall left/right
  center at every depth, rather than re-centering per ring — fine for
  roughly rectangular crowd areas, less precise for very irregular shapes.
