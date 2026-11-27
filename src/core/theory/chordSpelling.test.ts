import { describe, expect, it } from 'vitest'
import { parseChordSymbol } from './chordParser'
import { spellChordTones } from './chordSpelling'

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
