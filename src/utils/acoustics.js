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
//
// PHYSICS MODEL — this deliberately mirrors how touring/install sound techs
// actually reason about coverage, rather than an arbitrary fixed spacing:
//
// 1. Inverse-square law: sound pressure level (SPL) falls off 20*log10(d)
//    with distance in a free field, which works out to a ~6.02 dB drop every
//    time the distance from the source DOUBLES ("the 6dB rule"). This is the
//    same law both the delay-tower spacing and the on-canvas SPL numbers are
//    derived from.
// 2. A main PA is considered to give even, reliable coverage from its "near"
//    reference distance out to double that distance (the point it has
//    dropped ~6dB) — beyond that, a delay tower re-establishes a fresh local
//    reference level and itself covers out to double ITS distance, and so
//    on. This produces GEOMETRICALLY (not evenly) spaced rings — delay
//    towers bunch closer together near the stage and spread out further
//    back — which is how real large-format PA/delay systems are typically
//    laid out, and is a materially better model than fixed-interval rings.
// 3. Coverage angle: a single point-source/line-array hang only throws
//    usefully across a limited horizontal angle. If the crowd is wide
//    relative to how close it starts, one hang can't physically cover it —
//    the model splits into a Left/Right hang pair at the stage edges instead
//    of pretending a single center hang can cover an unrealistic angle.
//
// This is still a planning heuristic, not a certified acoustic design (every
// real design also accounts for speaker directivity/Q, ground/wind
// gradients, air absorption of HF content, and the actual box specs in use)
// — see the disclaimer in the UI.

export const DEFAULT_TEMPERATURE_C = 20

// The "6dB rule": free-field SPL drops 20*log10(2) ≈ 6.02 dB every time
// distance from the source doubles. A coverage zone is considered evenly
// covered as long as the level doesn't vary more than this across it.
export const SIX_DB_DOUBLING_RATIO = 2

// A single well-flown main hang can be relied on to hold level for at least
// this far before needing reinforcement, even if the crowd starts closer
// than this — a practical floor so a crowd drawn right up against the stage
// doesn't get a string of unrealistically close-together delay towers.
export const MIN_MAIN_THROW_M = 20

// Typical usable horizontal coverage angle for a single line-array/point-
// source hang before a second, L/R-split hang is warranted for a wide
// audience. 90-100° is a common rule-of-thumb ceiling in system design.
export const MAX_SINGLE_HANG_COVERAGE_DEG = 100

// Where a flown/stacked main PA typically sits relative to the stage lip.
export const MAIN_PA_STANDOFF_M = 5

// Half the stage's own drawn width is used to place split L/R hangs; this
// is the fallback only if no stage width is available.
export const DEFAULT_STAGE_SPAN_FALLBACK_M = 8

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
 * Inverse-square-law SPL change, in dB, at `distanceMeters` relative to a
 * `referenceDistanceMeters` where the level is defined as 0 dB (e.g. the
 * front rail of the crowd). Negative = quieter than the reference.
 *   ΔdB = -20 * log10(distance / reference)
 * This is deliberately RELATIVE rather than tied to an assumed absolute
 * source SPL (which would need real loudspeaker specs we don't have) — it
 * answers "how much quieter is it back here," which is what matters for
 * deciding where reinforcement is needed.
 */
export function splDeltaDb(distanceMeters, referenceDistanceMeters) {
  if (!referenceDistanceMeters || referenceDistanceMeters <= 0 || !distanceMeters || distanceMeters <= 0) return 0
  return -20 * Math.log10(distanceMeters / referenceDistanceMeters)
}

/**
 * Core delay formula from the spec, now also reporting the inverse-square-
 * law SPL drop at this point (when a reference distance is given), so the
 * UI can show the actual acoustic reason a tower is needed, not just a
 * time-alignment number.
 *   distance_meters      = pixel_distance_from_main_PA * meters_per_pixel
 *   base_delay_ms         = (distance_meters / speed_of_sound) * 1000
 *   recommended_delay_ms  = base_delay_ms + 15   (Haas-effect offset)
 */
export function computeDelayForPoint(mainPA, towerPoint, metersPerPixel, temperatureCelsius = DEFAULT_TEMPERATURE_C, referenceDistanceMeters = null) {
  const pixelDist = pixelDistance(mainPA, towerPoint)
  const distanceMeters = pixelDist * metersPerPixel
  const speed = speedOfSoundMs(temperatureCelsius)
  const baseDelayMs = (distanceMeters / speed) * 1000
  const haasOffsetMs = 15
  const recommendedDelayMs = baseDelayMs + haasOffsetMs
  const splDrop = referenceDistanceMeters ? splDeltaDb(distanceMeters, referenceDistanceMeters) : null

  return {
    pixelDist,
    distanceMeters,
    speedOfSoundMs: speed,
    baseDelayMs,
    haasOffsetMs,
    recommendedDelayMs,
    splDeltaDb: splDrop,
    // A plain-language, plug-the-numbers-in breakdown for the results panel.
    formula: {
      distance: `${distanceMeters.toFixed(1)}m = ${pixelDist.toFixed(0)}px × ${metersPerPixel.toFixed(4)}m/px`,
      baseDelay: `${baseDelayMs.toFixed(1)}ms = (${distanceMeters.toFixed(1)}m ÷ ${speed.toFixed(1)}m/s) × 1000`,
      recommended: `${recommendedDelayMs.toFixed(1)}ms = ${baseDelayMs.toFixed(1)}ms + 15ms (Haas offset)`,
      spl: splDrop !== null ? `${splDrop.toFixed(1)} dB = -20·log10(${distanceMeters.toFixed(1)}m ÷ ${referenceDistanceMeters.toFixed(1)}m)` : null,
    },
  }
}

/**
 * Places a main PA position just in front of the stage, along the direction
 * the stage is facing — this is where a flown/stacked main PA would
 * typically sit relative to the stage lip.
 */
export function computeMainPAPosition(stagePosition, facingUnitVector, metersPerPixel) {
  const standoffPx = metersPerPixel ? MAIN_PA_STANDOFF_M / metersPerPixel : 0
  return {
    x: stagePosition.x + facingUnitVector.x * standoffPx,
    y: stagePosition.y + facingUnitVector.y * standoffPx,
  }
}

/**
 * Horizontal angle (in degrees) a single hang at `referencePoint` would need
 * to cover the crowd's full lateral spread, judged at the crowd's NEAREST
 * depth (the most demanding case — the same physical width subtends a
 * smaller angle further away, so if the near edge is fine, the rest is too).
 * This is an approximation (real coverage-angle design also varies by depth
 * across an uneven crowd shape), not a substitute for a proper prediction model.
 */
export function computeCoverageAngleDeg(referencePoint, facingUnitVector, crowdPoints, nearDepthPx) {
  if (nearDepthPx <= 0) return 180
  const across = perpendicular(facingUnitVector)
  const acrossOffsets = crowdPoints.map((p) => dot({ x: p.x - referencePoint.x, y: p.y - referencePoint.y }, across))
  const halfWidthPx = Math.max(Math.abs(Math.min(...acrossOffsets)), Math.abs(Math.max(...acrossOffsets)))
  return 2 * Math.atan2(halfWidthPx, nearDepthPx) * (180 / Math.PI)
}

/**
 * Decides whether one main hang can physically cover the crowd, or whether
 * it needs to split into a Left/Right pair — and if so, positions them at
 * the edges of the stage the vendor actually drew (falling back to a
 * generic span if no stage width was given).
 */
export function computeMainPAPositions({ stagePosition, facingUnitVector, crowdPoints, metersPerPixel, nearDepthPx, stageWidthMeters }) {
  const mainPACenter = computeMainPAPosition(stagePosition, facingUnitVector, metersPerPixel)
  const coverageAngleDeg = computeCoverageAngleDeg(mainPACenter, facingUnitVector, crowdPoints, nearDepthPx)
  const needsSplitHangs = coverageAngleDeg > MAX_SINGLE_HANG_COVERAGE_DEG

  if (!needsSplitHangs) {
    return { positions: [{ ...mainPACenter, side: 'center' }], mainPACenter, coverageAngleDeg, needsSplitHangs }
  }

  const across = perpendicular(facingUnitVector)
  const spanMeters = stageWidthMeters && stageWidthMeters > 0.5 ? stageWidthMeters : DEFAULT_STAGE_SPAN_FALLBACK_M
  // Hangs sit inset from the very edge of the stage (0.8x half-width), not
  // hanging off it entirely — a common practical positioning.
  const offsetPx = (spanMeters / 2) * 0.8 / metersPerPixel

  return {
    positions: [
      { x: mainPACenter.x - across.x * offsetPx, y: mainPACenter.y - across.y * offsetPx, side: 'left' },
      { x: mainPACenter.x + across.x * offsetPx, y: mainPACenter.y + across.y * offsetPx, side: 'right' },
    ],
    mainPACenter,
    coverageAngleDeg,
    needsSplitHangs,
  }
}

/**
 * Lays out delay towers using the inverse-square-law "6dB rule": the main
 * PA (or centerline reference) is treated as holding even level out to
 * `designThrowM`, and loses ~6dB by double that distance — so the first
 * tower goes at 2x, re-establishes a fresh reference there, and itself
 * covers out to 4x, where the next tower goes, and so on. This produces
 * geometrically (not evenly) spaced towers, closer together near the stage
 * and further apart deeper into the crowd, matching how real large-format
 * delay systems are laid out — a materially better model than a fixed
 * interval, and it naturally never proposes a tower before the audience
 * actually starts.
 */
export function generateDelayTowerSuggestions({ mainPA, facingUnitVector, crowdPoints, metersPerPixel, temperatureCelsius = DEFAULT_TEMPERATURE_C }) {
  if (!crowdPoints || crowdPoints.length < 3 || !metersPerPixel) {
    return { crowdDepthMeters: 0, mainCoverage: null, delayTowers: [], nearDepthPx: 0 }
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

  const nearDepthM = nearDepthPx * metersPerPixel
  const farDepthM = farDepthPx * metersPerPixel
  const crowdDepthMeters = Math.max(0, farDepthM - nearDepthM)

  // The main PA's own even-coverage throw: at least MIN_MAIN_THROW_M
  // regardless of how close the crowd starts (a competent hang isn't
  // delay-ringed every few meters just because the front rail is close).
  const designThrowM = Math.max(nearDepthM, MIN_MAIN_THROW_M)

  const delayTowers = []
  let zoneStartM = designThrowM
  let towerDistanceM = designThrowM * SIX_DB_DOUBLING_RATIO

  while (towerDistanceM <= farDepthM - MIN_MARGIN_TO_BACK_OF_CROWD_M && delayTowers.length < MAX_DELAY_TOWERS) {
    const towerDistancePx = towerDistanceM / metersPerPixel
    const position = {
      x: mainPA.x + axis.x * towerDistancePx + across.x * centerAcrossPx,
      y: mainPA.y + axis.y * towerDistancePx + across.y * centerAcrossPx,
    }
    const delay = computeDelayForPoint(mainPA, position, metersPerPixel, temperatureCelsius, designThrowM)
    delayTowers.push({
      id: `delay-${delayTowers.length + 1}`,
      position,
      zoneStartM,
      zoneEndM: towerDistanceM * SIX_DB_DOUBLING_RATIO,
      ...delay,
    })
    zoneStartM = towerDistanceM
    towerDistanceM *= SIX_DB_DOUBLING_RATIO
  }

  return {
    crowdDepthMeters,
    nearDepthPx,
    mainCoverage: { nearM: designThrowM, sixDbPointM: designThrowM * SIX_DB_DOUBLING_RATIO },
    delayTowers,
  }
}

/**
 * Top-level entry point: takes the raw state the Planner page holds and
 * returns the full suggestion set (main PA hang(s) + delay towers) ready to
 * render.
 *
 * There's no separate "which way does the stage face" input — the vendor
 * just draws the stage as a box and the crowd as a boundary, and the
 * sound-projection axis is simply the direction from the stage toward the
 * crowd's centroid. A stage naturally faces its audience, so this needs no
 * extra click and can't be set inconsistently with where the crowd actually is.
 */
export function generateSuggestions({ stagePosition, stageWidthMeters, crowdPoints, metersPerPixel, temperatureCelsius }) {
  if (!stagePosition || !crowdPoints || crowdPoints.length === 0 || !metersPerPixel) return null

  const crowdCentroid = computeCentroid(crowdPoints)
  const facingUnitVector = unitVector(stagePosition, crowdCentroid)

  const { crowdDepthMeters, mainCoverage, delayTowers, nearDepthPx } = generateDelayTowerSuggestions({
    mainPA: computeMainPAPosition(stagePosition, facingUnitVector, metersPerPixel),
    facingUnitVector,
    crowdPoints,
    metersPerPixel,
    temperatureCelsius,
  })

  const { positions: mainPAs, mainPACenter, coverageAngleDeg, needsSplitHangs } = computeMainPAPositions({
    stagePosition,
    facingUnitVector,
    crowdPoints,
    metersPerPixel,
    nearDepthPx,
    stageWidthMeters,
  })

  return {
    mainPAs,
    mainPA: mainPACenter, // centerline reference — what delay times/SPL are measured from
    coverageAngleDeg,
    needsSplitHangs,
    facingUnitVector,
    crowdDepthMeters,
    mainCoverage,
    delayTowers,
    speedOfSoundMs: speedOfSoundMs(temperatureCelsius),
  }
}
