import { describe, expect, it } from 'vitest'
import golden from './__fixtures__/java-golden.json'
import { analyzeChord } from './chordAnalyzer'
import { formatChordName } from './format'

/** Java 版と同じ書き方（♯ だけ・ASCII） */
const javaLabel = (notes: number[]) => formatChordName(analyzeChord(notes), { key: null, style: 'ascii' })

describe('analyzeChord', () => {
  it.each([
    [[], '-'],
    [[60], 'C4'],
    [[60, 64], 'C4 - E4 (長3度)'],
    [[60, 64, 67], 'C'],
    [[64, 67, 72], 'C/E'],
    [[57, 60, 64], 'Am'],
    [[60, 64, 67, 70], 'C7'],
    [[62, 65, 69, 72], 'Dm7'],
    [[60, 64, 67, 71, 74], 'Cmaj9'],
    [[59, 62, 65, 69], 'Bm7-5'],
    [[55, 59, 62, 65, 68], 'G7(b9)'],
    [[60, 65, 67], 'Csus4'],
  ])('%j → %s', (notes, label) => {
    expect(javaLabel(notes)).toBe(label)
  })

  it('近似候補には (?) を付ける', () => {
    const r = analyzeChord([60, 61, 64, 67])
    expect(r.kind === 'chord' && r.approximate).toBe(true)
    expect(javaLabel([60, 61, 64, 67]).endsWith('(?)')).toBe(true)
  })

  it(`Java 版と同じ結果になる（${golden.length} 通り）`, () => {
    const mismatches = golden
      .map(({ notes, label }) => ({ notes, expected: label, actual: javaLabel(notes) }))
      .filter((c) => c.expected !== c.actual)
    expect(mismatches).toEqual([])
  })
})
