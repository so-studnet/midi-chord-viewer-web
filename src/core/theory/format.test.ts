import { describe, expect, it } from 'vitest'
import { analyzeChord } from './chordAnalyzer'
import { formatChordName, formatDegree, formatNoteName } from './format'
import { keyName, spellPitchClass } from './spelling'

const key = (tonic: number) => ({ tonic })

describe('spellPitchClass', () => {
  it('キーなしは Java 版と同じく ♯ だけ', () => {
    expect([1, 3, 6, 8, 10].map((pc) => spellPitchClass(pc, null, 'ascii'))).toEqual(['C#', 'D#', 'F#', 'G#', 'A#'])
  })
  it('キー C では ♭II ♭III ♯IV ♭VI ♭VII の書き方', () => {
    expect([1, 3, 6, 8, 10].map((pc) => spellPitchClass(pc, key(0)))).toEqual(['D♭', 'E♭', 'F♯', 'A♭', 'B♭'])
  })
  it('キー F では B♭、キー E では D♯', () => {
    expect(spellPitchClass(10, key(5))).toBe('B♭')
    expect(spellPitchClass(3, key(4))).toBe('D♯')
  })
  it('キー D♭ の音階', () => {
    expect([1, 3, 5, 6, 8, 10, 0].map((pc) => spellPitchClass(pc, key(1)))).toEqual(['D♭', 'E♭', 'F', 'G♭', 'A♭', 'B♭', 'C'])
  })
  it('ダブルフラットにはしない', () => {
    // キー D♭ の ♭VI は本来 B𝄫 → A と書く
    expect(spellPitchClass(9, key(1))).toBe('A')
  })
  it('キー名', () => {
    expect(keyName(key(0))).toBe('C / Am')
    expect(keyName(key(3))).toBe('E♭ / Cm')
    expect(keyName(key(6))).toBe('F♯ / D♯m')
    expect(keyName(key(10))).toBe('B♭ / Gm')
  })
})

describe('formatChordName', () => {
  it('キーに合わせた ♯/♭', () => {
    expect(formatChordName(analyzeChord([58, 62, 65]), { key: key(5) })).toBe('B♭')
    expect(formatChordName(analyzeChord([58, 62, 65]), { key: null })).toBe('A♯')
    expect(formatChordName(analyzeChord([55, 59, 62, 65, 68]), { key: key(0) })).toBe('G7(♭9)')
    expect(formatChordName(analyzeChord([62, 70]), { key: key(5) })).toBe('D4 - B♭4 (短6度)')
  })
  it('音名', () => {
    expect(formatNoteName(70, { key: key(5) })).toBe('B♭4')
    expect(formatNoteName(70, { key: null, style: 'ascii' })).toBe('A#4')
  })
})

describe('formatDegree', () => {
  const deg = (notes: number[], tonic: number) => formatDegree(analyzeChord(notes), key(tonic))
  it.each([
    [[62, 65, 69, 72], 0, 'IIm7'],
    [[55, 59, 62, 65], 0, 'V7'],
    [[59, 62, 67], 0, 'V/VII'],
    [[57, 60, 64], 0, 'VIm'],
    [[58, 62, 65], 0, '♭VII'],
    [[56, 60, 63, 67], 0, '♭VImaj7'],
    [[54, 57, 60, 64], 0, '♯IVm7-5'],
    [[64, 68, 71, 74], 0, 'III7'],
    [[58, 62, 65], 5, 'IV'],
    [[55, 58, 62, 65], 5, 'IIm7'],
  ])('%j (キー %i) → %s', (notes, tonic, expected) => {
    expect(deg(notes, tonic)).toBe(expected)
  })
  it('コードでなければ null', () => {
    expect(deg([60], 0)).toBeNull()
    expect(deg([60, 64], 0)).toBeNull()
  })
  it('近似候補は (?)', () => {
    expect(deg([60, 61, 64, 67], 0)?.endsWith('(?)')).toBe(true)
  })
})
