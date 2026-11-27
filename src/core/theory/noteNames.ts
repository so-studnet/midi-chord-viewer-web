const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

/** 負の数も 0〜11 に丸めたピッチクラス */
export function pitchClassOf(midiNote: number): number {
  return ((midiNote % 12) + 12) % 12
}

export function pitchClassName(pitchClass: number): string {
  return NAMES[pitchClassOf(pitchClass)]
}

/** 例: 60 → "C4"（MIDI 60 を C4 とする表記） */
export function fullName(midiNote: number): string {
  return pitchClassName(midiNote) + (Math.floor(midiNote / 12) - 1)
}

const BLACK = [false, true, false, true, false, false, true, false, true, false, true, false]

export function isBlackKey(midiNote: number): boolean {
  return BLACK[pitchClassOf(midiNote)]
}
