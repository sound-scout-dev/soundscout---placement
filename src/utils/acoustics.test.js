import { describe, it, expect } from 'vitest'
import {
  speedOfSoundMs,
  computeMetersPerPixel,
  computeDelayForPoint,
  computeCentroid,
  splDeltaDb,
  computeCoverageAngleDeg,
  computeMainPAPositions,
  generateSuggestions,
  MIN_MAIN_THROW_M,
  MAX_STEREO_PAIR_COVERAGE_DEG,
  MAIN_PA_STANDOFF_M,
} from './acoustics'

describe('speedOfSoundMs', () => {
  it('matches the standard 20°C reference value (~343 m/s)', () => {
    expect(speedOfSoundMs(20)).toBeCloseTo(343.42, 1)
  })

  it('increases with temperature', () => {
    expect(speedOfSoundMs(30)).toBeGreaterThan(speedOfSoundMs(20))
  })
})

describe('computeMetersPerPixel', () => {
  it('derives scale from a calibration line', () => {
    const a = { x: 0, y: 0 }
    const b = { x: 100, y: 0 }
    // 40m fence spanning 100px -> 0.4 m/px
    expect(computeMetersPerPixel(a, b, 40)).toBeCloseTo(0.4, 5)
  })

  it('returns null for a zero-length line', () => {
    const a = { x: 10, y: 10 }
    expect(computeMetersPerPixel(a, a, 40)).toBeNull()
  })
})

describe('splDeltaDb', () => {
  it('drops ~6dB every time distance doubles (the inverse-square law "6dB rule")', () => {
    expect(splDeltaDb(2, 1)).toBeCloseTo(-6.02, 1)
    expect(splDeltaDb(4, 1)).toBeCloseTo(-12.04, 1)
    expect(splDeltaDb(8, 1)).toBeCloseTo(-18.06, 1)
  })

  it('is 0 dB at the reference distance itself', () => {
    expect(splDeltaDb(10, 10)).toBeCloseTo(0, 5)
  })

  it('is positive (louder) when closer than the reference', () => {
    expect(splDeltaDb(1, 2)).toBeGreaterThan(0)
  })
})

describe('computeDelayForPoint', () => {
  it('applies the base formula plus the 15ms Haas offset', () => {
    // 0.5 m/px, tower 200px from main PA => 100m away
    const mainPA = { x: 0, y: 0 }
    const tower = { x: 200, y: 0 }
    const result = computeDelayForPoint(mainPA, tower, 0.5, 20)

    expect(result.distanceMeters).toBeCloseTo(100, 5)
    const expectedBase = (100 / speedOfSoundMs(20)) * 1000
    expect(result.baseDelayMs).toBeCloseTo(expectedBase, 5)
    expect(result.recommendedDelayMs).toBeCloseTo(expectedBase + 15, 5)
  })

  it('reports the SPL drop relative to a reference distance when given one', () => {
    const mainPA = { x: 0, y: 0 }
    const tower = { x: 40, y: 0 } // 40m away at 1 m/px
    const result = computeDelayForPoint(mainPA, tower, 1, 20, 20) // reference = 20m -> tower is 2x -> -6dB
    expect(result.splDeltaDb).toBeCloseTo(-6.02, 1)
  })

  it('omits SPL info when no reference distance is given', () => {
    const result = computeDelayForPoint({ x: 0, y: 0 }, { x: 40, y: 0 }, 1, 20)
    expect(result.splDeltaDb).toBeNull()
  })
})

describe('computeCentroid', () => {
  it('averages a set of points', () => {
    const centroid = computeCentroid([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ])
    expect(centroid).toEqual({ x: 5, y: 5 })
  })
})

describe('computeCoverageAngleDeg', () => {
  const referencePoint = { x: 0, y: 0 }
  const facingUnitVector = { x: 0, y: 1 }

  it('is wide for a crowd that starts close and spans wide', () => {
    const crowdPoints = [
      { x: -50, y: 10 },
      { x: 50, y: 10 },
      { x: 50, y: 40 },
      { x: -50, y: 40 },
    ]
    const angle = computeCoverageAngleDeg(referencePoint, facingUnitVector, crowdPoints, 10)
    expect(angle).toBeGreaterThan(MAX_STEREO_PAIR_COVERAGE_DEG)
  })

  it('is narrow for a crowd that starts far and is narrow', () => {
    const crowdPoints = [
      { x: -10, y: 30 },
      { x: 10, y: 30 },
      { x: 10, y: 90 },
      { x: -10, y: 90 },
    ]
    const angle = computeCoverageAngleDeg(referencePoint, facingUnitVector, crowdPoints, 30)
    expect(angle).toBeLessThan(MAX_STEREO_PAIR_COVERAGE_DEG)
  })
})

describe('computeMainPAPositions', () => {
  const stagePosition = { x: 0, y: 0 }
  const facingUnitVector = { x: 0, y: 1 }
  const metersPerPixel = 1

  it('always places a symmetric Left/Right pair, even for a normal narrow crowd', () => {
    const crowdPoints = [
      { x: -10, y: 30 },
      { x: 10, y: 30 },
      { x: 10, y: 90 },
      { x: -10, y: 90 },
    ]
    const result = computeMainPAPositions({ stagePosition, facingUnitVector, crowdPoints, metersPerPixel, nearDepthPx: 25, stageWidthMeters: 8 })
    expect(result.positions).toHaveLength(2)
    expect(result.positions.map((p) => p.side).sort()).toEqual(['left', 'right'])
    expect(result.wideCoverageWarning).toBe(false)
    // Symmetric around the centerline.
    expect(result.positions[0].x).toBeCloseTo(-result.positions[1].x, 5)
  })

  it('flags a wide-coverage warning when even a stereo pair would be stretched thin', () => {
    const crowdPoints = [
      { x: -80, y: 5 },
      { x: 80, y: 5 },
      { x: 80, y: 20 },
      { x: -80, y: 20 },
    ]
    const result = computeMainPAPositions({ stagePosition, facingUnitVector, crowdPoints, metersPerPixel, nearDepthPx: 5, stageWidthMeters: 8 })
    expect(result.wideCoverageWarning).toBe(true)
    expect(result.positions).toHaveLength(2) // still just the standard pair, not more hangs
  })

  it('positions the pair using the stage\'s own width, in front of the stage', () => {
    const crowdPoints = [
      { x: -10, y: 30 },
      { x: 10, y: 30 },
      { x: 10, y: 90 },
      { x: -10, y: 90 },
    ]
    const narrow = computeMainPAPositions({ stagePosition, facingUnitVector, crowdPoints, metersPerPixel, nearDepthPx: 25, stageWidthMeters: 4 })
    const wide = computeMainPAPositions({ stagePosition, facingUnitVector, crowdPoints, metersPerPixel, nearDepthPx: 25, stageWidthMeters: 20 })
    const spanOf = (r) => Math.abs(r.positions[0].x - r.positions[1].x)
    expect(spanOf(wide)).toBeGreaterThan(spanOf(narrow))
    // Both hangs sit ahead of the stage (same standoff distance forward).
    expect(narrow.positions[0].y).toBeCloseTo(MAIN_PA_STANDOFF_M, 5)
  })
})

describe('generateSuggestions', () => {
  // No separate "facing" input — the sound-projection axis is derived from
  // stagePosition -> crowd centroid, so a crowd centered directly below the
  // stage behaves like the old "facing down" case.
  const stagePosition = { x: 0, y: 0 }
  const metersPerPixel = 1 // 1px = 1m, easy to reason about

  it('derives the facing direction from the crowd centroid, not a separate click', () => {
    const crowdPoints = [
      { x: -10, y: 40 },
      { x: 10, y: 40 },
      { x: 10, y: 80 },
      { x: -10, y: 80 },
    ]
    const result = generateSuggestions({ stagePosition, crowdPoints, metersPerPixel, temperatureCelsius: 20 })
    expect(result.facingUnitVector.y).toBeCloseTo(1, 5) // crowd is straight below -> faces "down"
    expect(result.facingUnitVector.x).toBeCloseTo(0, 5)
  })

  it('needs no delay towers when the crowd is within the main PA\'s own 6dB throw', () => {
    // Crowd sits entirely inside the main PA's design throw (MIN_MAIN_THROW_M -> 2x that).
    const crowdPoints = [
      { x: -10, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 20 },
      { x: -10, y: 20 },
    ]
    const result = generateSuggestions({ stagePosition, crowdPoints, metersPerPixel, temperatureCelsius: 20 })
    expect(result.delayTowers).toHaveLength(0)
    expect(result.mainCoverage.nearM).toBeCloseTo(MIN_MAIN_THROW_M, 5)
  })

  it('spaces delay towers GEOMETRICALLY (each ~2x the previous distance), not evenly', () => {
    const crowdPoints = [
      { x: -20, y: 5 },
      { x: 20, y: 5 },
      { x: 20, y: 200 },
      { x: -20, y: 200 },
    ]
    const result = generateSuggestions({ stagePosition, crowdPoints, metersPerPixel, temperatureCelsius: 20 })
    expect(result.delayTowers.length).toBeGreaterThanOrEqual(2)

    const distances = result.delayTowers.map((t) => t.distanceMeters)
    // Strictly increasing...
    expect(distances).toEqual([...distances].sort((a, b) => a - b))
    // ...and each roughly double the one before (the 6dB-rule doubling),
    // not a fixed additive step.
    for (let i = 1; i < distances.length; i++) {
      const ratio = distances[i] / distances[i - 1]
      expect(ratio).toBeGreaterThan(1.8)
      expect(ratio).toBeLessThan(2.2)
    }
  })

  it('reports a negative (quieter) SPL delta at each delay tower relative to the main PA throw', () => {
    const crowdPoints = [
      { x: -20, y: 5 },
      { x: 20, y: 5 },
      { x: 20, y: 200 },
      { x: -20, y: 200 },
    ]
    const result = generateSuggestions({ stagePosition, crowdPoints, metersPerPixel, temperatureCelsius: 20 })
    for (const tower of result.delayTowers) {
      expect(tower.splDeltaDb).toBeLessThan(0)
    }
  })

  it('always returns a Left/Right main PA pair', () => {
    const crowdPoints = [
      { x: -10, y: 40 },
      { x: 10, y: 40 },
      { x: 10, y: 80 },
      { x: -10, y: 80 },
    ]
    const result = generateSuggestions({ stagePosition, crowdPoints, metersPerPixel, stageWidthMeters: 10, temperatureCelsius: 20 })
    expect(result.mainPAs).toHaveLength(2)
    expect(result.mainPAs.map((p) => p.side).sort()).toEqual(['left', 'right'])
  })

  it('flags a wide-coverage warning for a crowd too wide even for the stereo pair', () => {
    const crowdPoints = [
      { x: -80, y: 5 },
      { x: 80, y: 5 },
      { x: 80, y: 20 },
      { x: -80, y: 20 },
    ]
    const result = generateSuggestions({ stagePosition, crowdPoints, metersPerPixel, stageWidthMeters: 10, temperatureCelsius: 20 })
    expect(result.wideCoverageWarning).toBe(true)
  })

  it('returns null if calibration is missing', () => {
    const result = generateSuggestions({ stagePosition, crowdPoints: [{ x: 0, y: 10 }], metersPerPixel: null, temperatureCelsius: 20 })
    expect(result).toBeNull()
  })

  it('returns null without any crowd points', () => {
    const result = generateSuggestions({ stagePosition, crowdPoints: [], metersPerPixel: 1, temperatureCelsius: 20 })
    expect(result).toBeNull()
  })
})
