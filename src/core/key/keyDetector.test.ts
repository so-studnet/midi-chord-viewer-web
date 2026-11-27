import { describe, expect, it } from 'vitest'
import { INITIAL_KEY_DETECTOR, stepKeyDetector, type KeyDetectorState } from './keyDetector'

const C = 0, D = 2, F = 5

/** コード進行を「1 コード secPerChord 秒」で弾いたことにして判定する */
function play(progression: number[][], { secPerChord = 2, from = INITIAL_KEY_DETECTOR, start = 0 } = {}) {
  let s: KeyDetectorState = from
  let t = start
  for (const chord of progression) {
    s = stepKeyDetector(s, { time: t, sounding: new Set(chord), onsets: chord })
    for (let i = 1; i <= secPerChord * 4; i++) {
      s = stepKeyDetector(s, { time: t + i * 0.25, sounding: new Set(chord) })
    }
    t += secPerChord
    s = stepKeyDetector(s, { time: t, sounding: new Set() })
  }
  return { state: s, time: t }
}

// MIDI ノートでのボイシング
const Cmaj = [48, 64, 67, 72]
const Dm7 = [50, 65, 69, 72]
const G7 = [43, 59, 65, 71]
const Am = [45, 64, 69, 72]
const Fmaj7 = [41, 64, 69, 72]
const Em = [40, 64, 67, 71]
const Gm7 = [43, 65, 70, 74]
const C7 = [48, 64, 70, 72]
const Fmaj = [41, 65, 69, 72]
const Bbmaj = [46, 65, 70, 74]
const Dmaj = [50, 66, 69, 74]
const A7 = [45, 67, 73, 76]
const Bm = [47, 66, 71, 74]
const Gmaj = [43, 67, 71, 74]
const Emaj = [40, 68, 71, 76]
const Dm = [50, 65, 69, 74]

describe('stepKeyDetector', () => {
  it('何も弾いていなければ未定', () => {
    expect(stepKeyDetector(INITIAL_KEY_DETECTOR, { time: 0, sounding: new Set() }).tonic).toBeNull()
  })

  it('C の II-V-I → C', () => {
    expect(play([Dm7, G7, Cmaj, Cmaj]).state.tonic).toBe(C)
  })

  it('C のカノン進行 → C', () => {
    expect(play([Cmaj, G7, Am, Em, Fmaj7, Cmaj, Fmaj7, G7]).state.tonic).toBe(C)
  })

  it('F の II-V-I と IV → F', () => {
    expect(play([Gm7, C7, Fmaj, Bbmaj, C7, Fmaj]).state.tonic).toBe(F)
  })

  it('D の進行 → D', () => {
    expect(play([Dmaj, Bm, Gmaj, A7, Dmaj]).state.tonic).toBe(D)
  })

  it('A マイナーの進行（Am Dm E Am）→ 平行長調の C', () => {
    expect(play([Am, Dm, Emaj, Am, Dm, Emaj, Am]).state.tonic).toBe(C)
  })

  it('単音のメロディー（C メジャースケール）→ C', () => {
    const scale = [60, 62, 64, 65, 67, 69, 71, 72, 67, 64, 60].map((n) => [n])
    expect(play(scale, { secPerChord: 0.5 }).state.tonic).toBe(C)
  })

  it('1 回だけ B♭ を弾いてもキーは変わらない（ちらつかない）', () => {
    const { state, time } = play([Cmaj, Fmaj7, G7, Cmaj, Am, Dm7, G7, Cmaj])
    expect(state.tonic).toBe(C)
    expect(play([Bbmaj], { from: state, start: time }).state.tonic).toBe(C)
  })

  it('D の曲を弾き続けると、C から D に切り替わる', () => {
    const { state, time } = play([Cmaj, Fmaj7, G7, Cmaj])
    expect(state.tonic).toBe(C)
    const d = play([Dmaj, Gmaj, A7, Dmaj, Bm, Gmaj, A7, Dmaj, Dmaj, Gmaj, A7, Dmaj], { from: state, start: time })
    expect(d.state.tonic).toBe(D)
  })

  it('長い休みのあとは前の曲の影響が小さい', () => {
    const { state, time } = play([Dmaj, Gmaj, A7, Dmaj, Dmaj, Gmaj, A7, Dmaj])
    expect(state.tonic).toBe(D)
    const later = play([Fmaj, Bbmaj, C7, Fmaj, Gm7, C7, Fmaj], { from: state, start: time + 120 })
    expect(later.state.tonic).toBe(F)
  })

})
