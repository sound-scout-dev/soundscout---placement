import { describe, it, expect } from 'vitest'
import { classifyEquipmentItems, parseInfraPlanInput, comparePlanToSuggestions } from './infraPlan'

describe('classifyEquipmentItems', () => {
  it('classifies main-PA and delay items separately, summing quantities', () => {
    const result = classifyEquipmentItems([
      '4x JBL VTX A12 Line Array Speakers',
      '2x L-Acoustics Delay Speakers (Optional: for large venues)',
      '6x LED Par Lights',
      '1x 100kVA Generator',
    ])
    expect(result.totalMainUnits).toBe(4)
    expect(result.totalDelayUnits).toBe(2)
  })

  it('does not double-count a "delay speaker" item as a main-PA item too', () => {
    const result = classifyEquipmentItems(['3x Delay Speakers'])
    expect(result.totalDelayUnits).toBe(3)
    expect(result.totalMainUnits).toBe(0)
  })

  it('defaults quantity to 1 when no leading number is present', () => {
    const result = classifyEquipmentItems(['Subwoofer stack'])
    expect(result.totalMainUnits).toBe(1)
  })

  it('ignores blank/non-string entries', () => {
    const result = classifyEquipmentItems(['', '  ', '2x Speakers'])
    expect(result.items).toHaveLength(1)
  })
})

describe('parseInfraPlanInput', () => {
  it('parses a pasted full plan JSON object using the requested plan key', () => {
    const json = JSON.stringify({
      budget_plan: ['2x Active PA Speakers'],
      premium_plan: ['4x Line Array Speakers', '2x Delay Speakers'],
    })
    const premium = parseInfraPlanInput(json, 'premium')
    expect(premium.totalMainUnits).toBe(4)
    expect(premium.totalDelayUnits).toBe(2)

    const budget = parseInfraPlanInput(json, 'budget')
    expect(budget.totalMainUnits).toBe(2)
    expect(budget.totalDelayUnits).toBe(0)
  })

  it('parses a plain JSON array directly', () => {
    const result = parseInfraPlanInput(JSON.stringify(['3x Speakers', '1x Delay Speaker']))
    expect(result.totalMainUnits).toBe(3)
    expect(result.totalDelayUnits).toBe(1)
  })

  it('falls back to plain newline/bullet-separated text when not JSON', () => {
    const result = parseInfraPlanInput('- 2x Line Array Speakers\n- 1x Delay Speaker\n')
    expect(result.totalMainUnits).toBe(2)
    expect(result.totalDelayUnits).toBe(1)
  })

  it('throws a friendly error on empty input', () => {
    expect(() => parseInfraPlanInput('   ')).toThrow(/paste/i)
  })
})

describe('comparePlanToSuggestions', () => {
  const suggestions = { mainPAs: [{ side: 'center' }], delayTowers: [{}, {}] } // 1 hang, needs 2 delay towers

  it('flags a shortfall when the plan has fewer delay units than the physics suggests', () => {
    const planCounts = { totalMainUnits: 2, totalDelayUnits: 1 }
    const result = comparePlanToSuggestions(planCounts, suggestions)
    expect(result.delayOk).toBe(false)
    expect(result.delaySummary).toMatch(/2 delay tower/)
  })

  it('is satisfied when the plan has enough delay units', () => {
    const planCounts = { totalMainUnits: 2, totalDelayUnits: 3 }
    const result = comparePlanToSuggestions(planCounts, suggestions)
    expect(result.delayOk).toBe(true)
  })

  it('flags missing main-PA equipment entirely', () => {
    const planCounts = { totalMainUnits: 0, totalDelayUnits: 2 }
    const result = comparePlanToSuggestions(planCounts, suggestions)
    expect(result.mainOk).toBe(false)
  })
})
