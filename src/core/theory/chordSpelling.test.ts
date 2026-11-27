import { describe, expect, it } from 'vitest'
import { parseChordSymbol } from './chordParser'
import { spellBass, spellChordTones } from './chordSpelling'
import { chordSymbol } from './format'

const tones = (s: string, tonic: number | null = null) => {
  const r = parseChordSymbol(s, { tonic: 0 })
  if (!r.ok) throw new Error(r.error)
  return spellChordTones(r.chord.root, r.chord.template.mask, tonic === null ? null : { tonic }).join(' ')
}

describe('spellChordTones', () => {
  it.each([
    ['C', null, 'C E G'],
    ['G7(b9)', null, 'G A♭ B D F'],
    ['C7(#9)', null, 'C D♯ E G B♭'],
    ['Cm7', null, 'C E♭ G B♭'],
    ['F#m7-5', null, 'F♯ A C E'],
    ['C7(b5)', null, 'C E G♭ B♭'],
    ['C7(#11)', null, 'C E F♯ G B♭'],
    ['Caug', null, 'C E G♯'],
    ['C7(b13)', null, 'C E G A♭ B♭'],
    ['Cdim7', null, 'C E♭ G♭ A'],
    ['Bbm7', 5, 'B♭ D♭ F A♭'],
    ['A#m7', 5, 'B♭ D♭ F A♭'],
    ['E', 4, 'E G♯ B'],
    ['Db', 1, 'D♭ F A♭'],
  ])('%s（キー %s）→ %s', (chord, tonic, expected) => {
    expect(tones(chord, tonic)).toBe(expected)
  })
})

describe('分数コードのベース音', () => {
  const symbol = (s: string, tonic: number | null) => {
    const r = parseChordSymbol(s, { tonic: 0 })
    if (!r.ok) throw new Error(r.error)
    const c = r.chord
    return chordSymbol(c.root, c.template, c.bass, { key: tonic === null ? null : { tonic } })
  }
  it.each([
    // ベースが構成音なら構成音の書き方
    ['Bbaug7/G#', 9, 'B♭aug7/A♭'],
    ['Bbaug7/G#', 0, 'B♭aug7/A♭'],
    ['A#aug7/G#', null, 'A♯aug7/G♯'],
    ['G7(b9)/G#', 0, 'G7(♭9)/A♭'],
    ['C7/A#', 0, 'C7/B♭'],
    ['Cm7/D#', 0, 'Cm7/E♭'],
    ['E/G#', 0, 'E/G♯'],
    // ベースが構成音でなければキーの書き方
    ['Daug/G#', 9, 'Daug/G♯'], // キー A では VII = G♯
    ['Daug/G#', 0, 'Daug/A♭'], // キー C では ♭VI = A♭
    ['Daug/Ab', 3, 'Daug/A♭'],
    ['C/Bb', 0, 'C/B♭'],
  ])('%s（キー %s）→ %s', (input, tonic, expected) => {
    expect(symbol(input, tonic)).toBe(expected)
  })

  it('spellBass は構成音の何番目かで書き方を選ぶ', () => {
    const r = parseChordSymbol('Bbaug7', { tonic: 0 })
    if (!r.ok) throw new Error(r.error)
    expect(spellBass(r.chord.root, r.chord.template.mask, 8, { tonic: 9 })).toBe('A♭')
    expect(spellBass(r.chord.root, r.chord.template.mask, 2, { tonic: 9 })).toBe('D')
  })
})
