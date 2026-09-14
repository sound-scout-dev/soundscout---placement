import { describe, it, expect } from 'vitest'
import { speedOfSoundMs, computeMetersPerPixel, computeDelayForPoint, computeCentroid, generateSuggestions } from './acoustics'

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

describe('generateSuggestions', () => {
  // No separate "facing" input anymore — the sound-projection axis is
  // derived from stagePosition -> crowd centroid, so a crowd centered
  // directly below the stage behaves exactly like the old "facing down" case.
  const stagePosition = { x: 0, y: 0 }
  const metersPerPixel = 1 // 1px = 1m, easy to reason about

  it('derives the facing direction from the crowd centroid, not a separate click', () => {
    const crowdPoints = [
      { x: -10, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 20 },
      { x: -10, y: 20 },
    ]
    const result = generateSuggestions({ stagePosition, crowdPoints, metersPerPixel, temperatureCelsius: 20 })
    expect(result.facingUnitVector.y).toBeCloseTo(1, 5) // crowd is straight below -> faces "down"
    expect(result.facingUnitVector.x).toBeCloseTo(0, 5)
  })

  it('returns no delay towers when the crowd is shallower than one ring spacing', () => {
    const crowdPoints = [
      { x: -10, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 20 },
      { x: -10, y: 20 },
    ]
    const result = generateSuggestions({ stagePosition, crowdPoints, metersPerPixel, temperatureCelsius: 20 })
    expect(result.delayTowers).toHaveLength(0)
  })

  it('adds delay towers once the crowd is deep enough, spaced by DELAY_RING_SPACING_M', () => {
    const crowdPoints = [
      { x: -20, y: 5 },
      { x: 20, y: 5 },
      { x: 20, y: 90 },
      { x: -20, y: 90 },
    ]
    const result = generateSuggestions({ stagePosition, crowdPoints, metersPerPixel, temperatureCelsius: 20 })
    expect(result.delayTowers.length).toBeGreaterThan(0)
    // towers should get progressively further from the main PA
    const distances = result.delayTowers.map((t) => t.distanceMeters)
    expect(distances).toEqual([...distances].sort((a, b) => a - b))
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
