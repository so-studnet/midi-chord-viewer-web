import { describe, expect, it } from 'vitest'
import { analyzeChord } from './chordAnalyzer'
import {
  circleIndex,
  diatonicDegrees,
  keySignature,
  placeChord,
  placementKey,
  pushTrail,
  rootAt,
  segmentLabel,
  type Placement,
} from './circleOfFifths'

const labels = (ring: Placement['ring'], notation: 'standard' | 'japanese' | 'jazz' = 'standard') =>
  Array.from({ length: 12 }, (_, index) => segmentLabel({ ring, index }, notation)).join(' ')

describe('5 度圏', () => {
  it('並び', () => {
    expect(labels('major')).toBe('C G D A E B F♯/G♭ D♭ A♭ E♭ B♭ F')
    expect(labels('minor')).toBe('Am Em Bm F♯m C♯m G♯m D♯m/E♭m B♭m Fm Cm Gm Dm')
    expect(labels('dim')).toBe('Bm7-5 F♯m7-5 C♯m7-5 G♯m7-5 D♯m7-5 A♯m7-5 Fm7-5 Cm7-5 Gm7-5 Dm7-5 Am7-5 Em7-5')
    expect(labels('minor', 'jazz').split(' ')[0]).toBe('A-')
    expect(labels('dim', 'jazz').split(' ')[0]).toBe('Bø')
  })

  it('位置とルートの行き来', () => {
    for (let pc = 0; pc < 12; pc++) {
      for (const ring of ['major', 'minor', 'dim'] as const) {
        const p = { ring, index: circleIndex(ring === 'major' ? pc : ring === 'minor' ? pc + 3 : pc + 1) }
        expect(rootAt(p)).toBe(pc)
      }
    }
  })

  it.each([
    [[60, 64, 67], 'major', 0],
    [[55, 59, 62, 65], 'major', 1], // G7
    [[57, 60, 64], 'minor', 0], // Am
    [[62, 65, 69, 72], 'minor', 11], // Dm7 は F の位置の内側
    [[59, 62, 65, 69], 'dim', 0], // Bm7-5
    [[59, 62, 65], 'dim', 0], // Bdim
    [[60, 65, 67], 'major', 0], // Csus4
    [[64, 68, 72], 'major', 4], // Eaug
    [[59, 62, 67], 'major', 1], // G/B もルートの G
  ])('%j → %s の %i', (notes, ring, index) => {
    expect(placeChord(analyzeChord(notes))).toEqual({ ring, index })
  })

  it('コードでなければ置かない', () => {
    expect(placeChord(analyzeChord([60]))).toBeNull()
    expect(placeChord(analyzeChord([60, 64]))).toBeNull()
  })

  it('調号', () => {
    expect([0, 1, 5, 6, 7, 11].map((i) => keySignature(i))).toEqual(['0', '♯1', '♯5', '♯6/♭6', '♭5', '♭1'])
  })

  it('キー C のダイアトニック', () => {
    const d = diatonicDegrees(0, 'standard')
    expect(d.get(placementKey({ ring: 'major', index: 11 }))).toBe('IV')
    expect(d.get(placementKey({ ring: 'major', index: 0 }))).toBe('I')
    expect(d.get(placementKey({ ring: 'major', index: 1 }))).toBe('V')
    expect(d.get(placementKey({ ring: 'minor', index: 11 }))).toBe('IIm')
    expect(d.get(placementKey({ ring: 'minor', index: 0 }))).toBe('VIm')
    expect(d.get(placementKey({ ring: 'minor', index: 1 }))).toBe('IIIm')
    expect(d.get(placementKey({ ring: 'dim', index: 0 }))).toBe('VIIm7-5')
    expect(d.size).toBe(7)
  })

  it('キー E♭ のダイアトニックは E♭ の周り', () => {
    const d = diatonicDegrees(3, 'jazz')
    expect(d.get(placementKey({ ring: 'major', index: 9 }))).toBe('I')
    expect(d.get(placementKey({ ring: 'minor', index: 8 }))).toBe('II-')
    expect(d.get(placementKey({ ring: 'dim', index: 9 }))).toBe('VIIø')
  })

  it('履歴は同じ位置が続いたら足さず、最大 4 つ', () => {
    let t: Placement[] = []
    for (const p of [
      { ring: 'minor', index: 11 },
      { ring: 'minor', index: 11 },
      { ring: 'major', index: 1 },
      { ring: 'major', index: 0 },
      { ring: 'minor', index: 0 },
      { ring: 'major', index: 11 },
    ] as Placement[]) t = pushTrail(t, p)
    expect(t.map(placementKey)).toEqual(['major:1', 'major:0', 'minor:0', 'major:11'])
  })
})
