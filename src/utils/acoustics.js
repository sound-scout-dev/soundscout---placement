// utils/acoustics.js
//
// All the placement/delay math lives here, deliberately separate from any
// canvas or React code, so it can be unit tested and read on its own without
// wading through UI logic.
//
// Coordinate convention: every {x, y} point in this file is in the ORIGINAL
// IMAGE's pixel space (not on-screen/display pixels, which may be scaled to
// fit the container). The canvas layer is responsible for converting screen
// coordinates to image coordinates before calling into here.

export const DEFAULT_TEMPERATURE_C = 20

// A commonly cited rule-of-thumb spacing for outdoor line-array delay rings
// is roughly 100-120 ft (~30-37m) between the main PA (or previous ring) and
// the next delay ring, tightened or loosened in practice per system and
// venue. We use a single practical default here — this is a planning
// starting point, not a certified acoustic design (see disclaimer in UI).
export const DELAY_RING_SPACING_M = 35

// Don't suggest a delay tower inside the last few meters of the crowd area —
// there's no point delaying for a ring that lands right at (or past) the
// back fence.
export const MIN_MARGIN_TO_BACK_OF_CROWD_M = 5

// Sensible ceiling so a huge/oddly-drawn crowd polygon doesn't generate an
// absurd number of markers.
export const MAX_DELAY_TOWERS = 4

/**
 * Speed of sound in dry air, in m/s, adjusted for temperature.
 * v = 331.3 + 0.606 * T(°C)
 */
export function speedOfSoundMs(temperatureCelsius = DEFAULT_TEMPERATURE_C) {
  return 331.3 + 0.606 * temperatureCelsius
}

/** Euclidean distance between two {x, y} points, in whatever unit they're in. */
export function pixelDistance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/**
 * Converts a calibration line (two points the vendor clicked, plus the
 * real-world distance they typed in) into a meters-per-pixel scale factor
 * for the whole image.
 */
export function computeMetersPerPixel(pointA, pointB, realDistanceMeters) {
  const pxDist = pixelDistance(pointA, pointB)
  if (pxDist === 0 || !realDistanceMeters || realDistanceMeters <= 0) return null
  return realDistanceMeters / pxDist
}

/** Unit vector pointing from `from` to `to`. Returns {x:1, y:0} if the two points coincide. */
export function unitVector(from, to) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy)
  if (len === 0) return { x: 1, y: 0 }
  return { x: dx / len, y: dy / len }
}

/** 90-degree rotation of a vector (used to find the "left/right" axis across the crowd). */
export function perpendicular(v) {
  return { x: -v.y, y: v.x }
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y
}

/** Centroid (average point) of a polygon's vertices. */
export function computeCentroid(points) {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

/**
 * Core formula from the spec:
 *   distance_meters   = pixel_distance_from_main_PA * meters_per_pixel
 *   base_delay_ms      = (distance_meters / speed_of_sound) * 1000
 *   recommended_delay_ms = base_delay_ms + 15   (Haas-effect offset)
 *
 * Returns every intermediate value too, so the UI can show its work instead
 * of presenting a bare number.
 */
export function computeDelayForPoint(mainPA, towerPoint, metersPerPixel, temperatureCelsius = DEFAULT_TEMPERATURE_C) {
  const pixelDist = pixelDistance(mainPA, towerPoint)
  const distanceMeters = pixelDist * metersPerPixel
  const speed = speedOfSoundMs(temperatureCelsius)
  const baseDelayMs = (distanceMeters / speed) * 1000
  const haasOffsetMs = 15
  const recommendedDelayMs = baseDelayMs + haasOffsetMs

  return {
    pixelDist,
    distanceMeters,
    speedOfSoundMs: speed,
    baseDelayMs,
    haasOffsetMs,
    recommendedDelayMs,
    // A plain-language, plug-the-numbers-in breakdown for the results panel.
    formula: {
      distance: `${distanceMeters.toFixed(1)}m = ${pixelDist.toFixed(0)}px × ${metersPerPixel.toFixed(4)}m/px`,
      baseDelay: `${baseDelayMs.toFixed(1)}ms = (${distanceMeters.toFixed(1)}m ÷ ${speed.toFixed(1)}m/s) × 1000`,
      recommended: `${recommendedDelayMs.toFixed(1)}ms = ${baseDelayMs.toFixed(1)}ms + 15ms (Haas offset)`,
    },
  }
}

/**
 * Places a main PA position just in front of the stage, along the direction
 * the stage is facing — this is where a flown/stacked main PA would
 * typically sit relative to the stage lip.
 */
export function computeMainPAPosition(stagePosition, facingUnitVector, metersPerPixel) {
  const standoffMeters = 5
  const standoffPx = metersPerPixel ? standoffMeters / metersPerPixel : 0
  return {
    x: stagePosition.x + facingUnitVector.x * standoffPx,
    y: stagePosition.y + facingUnitVector.y * standoffPx,
  }
}

/**
 * Given the stage/facing direction, the main PA position, the crowd
 * boundary polygon, and the current scale/temperature, works out how deep
 * the crowd extends along the sound's travel direction and drops a delay
 * tower every DELAY_RING_SPACING_M until it runs out of room.
 *
 * Returns { crowdDepthMeters, delayTowers: [...] } where each tower has a
 * position plus the full computeDelayForPoint() breakdown.
 */
export function generateDelayTowerSuggestions({
  mainPA,
  facingUnitVector,
  crowdPoints,
  metersPerPixel,
  temperatureCelsius = DEFAULT_TEMPERATURE_C,
}) {
  if (!crowdPoints || crowdPoints.length < 3 || !metersPerPixel) {
    return { crowdDepthMeters: 0, delayTowers: [] }
  }

  const axis = facingUnitVector
  const across = perpendicular(axis)

  // Project every crowd-boundary vertex onto the stage-facing axis (depth)
  // and the perpendicular axis (how far left/right of the PA it sits).
  const depths = crowdPoints.map((p) => dot({ x: p.x - mainPA.x, y: p.y - mainPA.y }, axis))
  const acrossOffsets = crowdPoints.map((p) => dot({ x: p.x - mainPA.x, y: p.y - mainPA.y }, across))

  const nearDepthPx = Math.max(0, Math.min(...depths))
  const farDepthPx = Math.max(...depths)
  const centerAcrossPx = (Math.min(...acrossOffsets) + Math.max(...acrossOffsets)) / 2

  const crowdDepthMeters = Math.max(0, (farDepthPx - nearDepthPx) * metersPerPixel)

  const delayTowers = []
  let ringDistanceM = DELAY_RING_SPACING_M
  const nearDepthM = nearDepthPx * metersPerPixel
  const farDepthM = farDepthPx * metersPerPixel

  // Rings are spaced every DELAY_RING_SPACING_M from the main PA, but a ring
  // only becomes an actual tower once it falls INSIDE the crowd area
  // (>= nearDepthM) — otherwise it'd sit in the gap between the stage and
  // where the audience actually starts, which no vendor would rig.
  while (ringDistanceM <= farDepthM - MIN_MARGIN_TO_BACK_OF_CROWD_M && delayTowers.length < MAX_DELAY_TOWERS) {
    if (ringDistanceM >= nearDepthM) {
      const ringDistancePx = ringDistanceM / metersPerPixel
      const position = {
        x: mainPA.x + axis.x * ringDistancePx + across.x * centerAcrossPx,
        y: mainPA.y + axis.y * ringDistancePx + across.y * centerAcrossPx,
      }
      const delay = computeDelayForPoint(mainPA, position, metersPerPixel, temperatureCelsius)
      delayTowers.push({
        id: `delay-${delayTowers.length + 1}`,
        position,
        ...delay,
      })
    }
    ringDistanceM += DELAY_RING_SPACING_M
  }

  return { crowdDepthMeters, delayTowers }
}

/**
 * Top-level entry point: takes the raw state the Planner page holds and
 * returns the full suggestion set (main PA + delay towers) ready to render.
 *
 * There's no separate "which way does the stage face" input anymore — the
 * vendor just draws the stage as a box and the crowd as a boundary, and the
 * sound-projection axis is simply the direction from the stage toward the
 * crowd's centroid. A stage naturally faces its audience, so this needs no
 * extra click and can't be set inconsistently with where the crowd actually is.
 */
export function generateSuggestions({ stagePosition, crowdPoints, metersPerPixel, temperatureCelsius }) {
  if (!stagePosition || !crowdPoints || crowdPoints.length === 0 || !metersPerPixel) return null

  const crowdCentroid = computeCentroid(crowdPoints)
  const facingUnitVector = unitVector(stagePosition, crowdCentroid)
  const mainPA = computeMainPAPosition(stagePosition, facingUnitVector, metersPerPixel)
  const { crowdDepthMeters, delayTowers } = generateDelayTowerSuggestions({
    mainPA,
    facingUnitVector,
    crowdPoints,
    metersPerPixel,
    temperatureCelsius,
  })

  return {
    mainPA,
    facingUnitVector,
    crowdDepthMeters,
    delayTowers,
    speedOfSoundMs: speedOfSoundMs(temperatureCelsius),
  }
}
