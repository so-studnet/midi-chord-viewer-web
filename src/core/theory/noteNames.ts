/** 負の数も 0〜11 に丸めたピッチクラス */
export function pitchClassOf(midiNote: number): number {
  return ((midiNote % 12) + 12) % 12
}

const BLACK = [false, true, false, true, false, false, true, false, true, false, true, false]

export function isBlackKey(midiNote: number): boolean {
  return BLACK[pitchClassOf(midiNote)]
}
