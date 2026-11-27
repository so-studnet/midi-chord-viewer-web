import { describe, expect, it } from 'vitest'
import { chooseLayer, nearestSampledNote, sampleFileName, SAMPLED_NOTES } from './pianoSamples'

describe('pianoSamples', () => {
  it('A0〜C8 の 30 音', () => {
    expect(SAMPLED_NOTES.length).toBe(30)
    expect(SAMPLED_NOTES[0]).toBe(21)
    expect(SAMPLED_NOTES.at(-1)).toBe(108)
  })
  it('ファイル名', () => {
    expect(sampleFileName(60, 8)).toBe('C4v8.ogg')
    expect(sampleFileName(63, 16)).toBe('Ds4v16.ogg')
    expect(sampleFileName(21, 4)).toBe('A0v4.ogg')
  })
  it('一番近いサンプル', () => {
    expect(nearestSampledNote(60)).toBe(60)
    expect(nearestSampledNote(61)).toBe(60)
    expect(nearestSampledNote(62)).toBe(63)
    expect(nearestSampledNote(10)).toBe(21)
    expect(nearestSampledNote(120)).toBe(108)
  })
  it('ベロシティ → レイヤー', () => {
    expect(chooseLayer(127, [4, 8, 12, 16])?.layer).toBe(16)
    expect(chooseLayer(64, [4, 8, 12, 16])?.layer).toBe(8)
    expect(chooseLayer(10, [4, 8, 12, 16])?.layer).toBe(4)
    expect(chooseLayer(127, [8])?.layer).toBe(8)
    expect(chooseLayer(64, [])).toBeNull()
  })
})
