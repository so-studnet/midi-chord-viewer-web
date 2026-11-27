import { describe, expect, it } from 'vitest'
import { analyzeChord } from './chordAnalyzer'
import { canonicalSuffix, parseChordSymbol } from './chordParser'
import { CHORD_TEMPLATES, NOTATION_STYLES } from './chordTemplates'
import { chordSymbol, formatChordName } from './format'
import { chordVoicing } from './voicing'

const C = { tonic: 0 }
const parse = (s: string, key = C) => {
  const r = parseChordSymbol(s, key)
  if (!r.ok) throw new Error(r.error)
  return r.chord
}
/** 読み取って標準記法（ASCII・キーなし）で書き直す */
const roundTrip = (s: string, key = C) => {
  const c = parse(s, key)
  return chordSymbol(c.root, c.template, c.bass, { key: null, style: 'ascii' })
}

describe('parseChordSymbol', () => {
  it.each([
    ['C', 'C'], ['Cmaj', 'C'], ['CM', 'C'],
    ['Cm', 'Cm'], ['Cmin', 'Cm'], ['C-', 'Cm'], ['Cmi', 'Cm'],
    ['Cmaj7', 'Cmaj7'], ['CM7', 'Cmaj7'], ['C△7', 'Cmaj7'], ['CΔ7', 'Cmaj7'], ['C△', 'Cmaj7'], ['Cma7', 'Cmaj7'], ['Cj7', 'Cmaj7'],
    ['Cm7', 'Cm7'], ['C-7', 'Cm7'], ['Cmin7', 'Cm7'],
    ['Cm7-5', 'Cm7-5'], ['Cm7(b5)', 'Cm7-5'], ['Cm7(♭5)', 'Cm7-5'], ['Cm7b5', 'Cm7-5'], ['Cø', 'Cm7-5'], ['Cø7', 'Cm7-5'], ['C-7b5', 'Cm7-5'],
    ['Cdim', 'Cdim'], ['C°', 'Cdim'], ['Co', 'Cdim'], ['Cdim7', 'Cdim7'], ['C°7', 'Cdim7'], ['Co7', 'Cdim7'],
    ['Caug', 'Caug'], ['C+', 'Caug'], ['C(#5)', 'Caug'], ['Caug7', 'Caug7'], ['C+7', 'Caug7'], ['C7(#5)', 'Caug7'], ['C7+5', 'Caug7'],
    ['Cm(maj7)', 'Cm(maj7)'], ['CmM7', 'Cm(maj7)'], ['Cm△7', 'Cm(maj7)'], ['C-△7', 'Cm(maj7)'], ['Cmmaj7', 'Cm(maj7)'],
    ['Csus4', 'Csus4'], ['Csus', 'Csus4'], ['Csus2', 'Csus2'], ['C7sus4', 'C7sus4'], ['C7sus', 'C7sus4'],
    ['Cadd9', 'Cadd9'], ['C(9)', 'Cadd9'], ['Cadd2', 'Cadd9'], ['Cm(add9)', 'Cmadd9'], ['Cmadd9', 'Cmadd9'], ['Cm(9)', 'Cmadd9'],
    ['C9', 'C9'], ['C7(9)', 'C9'], ['CM9', 'Cmaj9'], ['C△9', 'Cmaj9'], ['Cmaj7(9)', 'Cmaj9'], ['Cm9', 'Cm9'], ['Cm7(9)', 'Cm9'],
    ['C7(b9)', 'C7(b9)'], ['C7b9', 'C7(b9)'], ['C7-9', 'C7(b9)'], ['C7(♭9)', 'C7(b9)'], ['C7(#9)', 'C7(#9)'], ['C7+9', 'C7(#9)'],
    ['C7(b5)', 'C7(b5)'], ['C7-5', 'C7(b5)'], ['C7(#11)', 'C7(#11)'], ['C7#11', 'C7(#11)'],
    ['C11', 'C11'], ['Cm11', 'Cm11'], ['C13', 'C13'], ['C7(9,13)', 'C13'], ['Cm13', 'Cm13'], ['CM13', 'Cmaj13'], ['C△13', 'Cmaj13'],
    ['C6', 'C6'], ['Cm6', 'Cm6'], ['C-6', 'Cm6'],
    ['C5', 'C5'], ['C69', 'C6/9'], ['C6/9', 'C6/9'], ['C6(9)', 'C6/9'], ['Cm69', 'Cm6/9'],
    ['C7(b13)', 'C7(b13)'], ['C7-13', 'C7(b13)'], ['C9(#11)', 'C9(#11)'], ['C7(9,#11)', 'C9(#11)'],
    ['CM7(#11)', 'Cmaj7(#11)'], ['C△7(#5)', 'Cmaj7(#5)'], ['Cm7(11)', 'Cm7(11)'],
    ['Cm7(b5,9)', 'Cm7-5(9)'], ['Cø9', 'Cm7-5(9)'], ['C7sus2', 'C7sus2'], ['C7(b9,13)', 'C7(b9,13)'], ['C7(#9,b13)', 'C7(#9,b13)'],
  ])('%s → %s', (input, expected) => {
    expect(roundTrip(input)).toBe(expected)
  })

  it.each([
    ['Bbm7', 'A#m7'], ['B♭m7', 'A#m7'], ['Ebmaj7', 'D#maj7'], ['F#m7-5', 'F#m7-5'], ['Cb', 'B'], ['bbm7', 'A#m7'],
    ['C/E', 'C/E'], ['G7/B', 'G7/B'], ['C6/9/E', 'C6/9/E'], ['Am7/G', 'Am7/G'], ['Ｃｍ７', 'Cm7'], [' C m 7 ', 'Cm7'],
  ])('ルート・ベース・全角: %s → %s', (input, expected) => {
    expect(roundTrip(input)).toBe(expected)
  })

  it.each([
    ['IIm7', 0, 'Dm7'], ['V7', 0, 'G7'], ['IM7', 0, 'Cmaj7'], ['bVII', 0, 'A#'], ['♭VI△7', 0, 'G#maj7'], ['#IVm7-5', 0, 'F#m7-5'],
    ['V7/VII', 0, 'G7/B'], ['ii7', 0, 'Dm7'], ['vi', 0, 'Am'], ['viiø', 0, 'Bm7-5'], ['IIm7', 5, 'Gm7'], ['IVmaj7', 7, 'Cmaj7'],
    ['Idim', 0, 'Cdim'], ['IVadd9', 0, 'Fadd9'],
  ])('度数: %s（キー %i）→ %s', (input, tonic, expected) => {
    expect(roundTrip(input, { tonic })).toBe(expected)
    expect(parse(input, { tonic }).fromDegree).toBe(true)
  })

  it.each(['', 'H7', 'Cxyz', 'C7(b10)', '/E'])('読み取れない: %j', (input) => {
    expect(parseChordSymbol(input, C).ok).toBe(false)
  })

  it('すべての種類が、どの記法の名前からも読み取れる', () => {
    for (const t of CHORD_TEMPLATES) {
      for (const { id } of NOTATION_STYLES) {
        const r = parseChordSymbol('C' + t.names[id], C)
        expect(r.ok && r.chord.template.id, `${id}: C${t.names[id]}`).toBe(t.id)
      }
    }
  })

  it('記法の名前どうしがぶつからない', () => {
    const seen = new Map<string, string>()
    for (const t of CHORD_TEMPLATES) {
      for (const name of new Set(Object.values(t.names))) {
        const c = canonicalSuffix(name)
        expect(seen.get(c) ?? t.id, `${name}`).toBe(t.id)
        seen.set(c, t.id)
      }
    }
  })
})

describe('chordVoicing', () => {
  it('基本形を C4 から積む', () => {
    const c = parse('Cmaj7')
    expect(chordVoicing(c.root, c.template.mask, c.bass)).toEqual([60, 64, 67, 71])
  })
  it('分数コードのベースはルートより下', () => {
    const c = parse('G7/B')
    expect(chordVoicing(c.root, c.template.mask, c.bass)).toEqual([59, 67, 71, 74, 77])
  })
  it('鍵盤に置いた音を判定すると、同じコードになる', () => {
    for (const s of ['Cmaj7', 'Bbm7', 'F#m7-5', 'G7(b9)', 'Ab6/9', 'C/E', 'E7(#9,b13)']) {
      const c = parse(s)
      const name = formatChordName(analyzeChord(chordVoicing(c.root, c.template.mask, c.bass)), { key: null, style: 'ascii' })
      expect(name, s).toBe(chordSymbol(c.root, c.template, c.bass, { key: null, style: 'ascii' }))
    }
  })
})
