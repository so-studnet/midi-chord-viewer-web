/**
 * アプリ内で扱う入力イベント。MIDI 機器・将来の MIDI ファイル再生・画面上の鍵盤など、
 * どこから来た入力もこの形にそろえてから状態・音源・記録へ流す。
 */
export type NoteEvent =
  | { readonly type: 'noteOn'; readonly note: number; readonly velocity: number }
  | { readonly type: 'noteOff'; readonly note: number }
  | { readonly type: 'sustain'; readonly down: boolean }

const SUSTAIN_CC = 64
const PEDAL_DOWN_THRESHOLD = 64

/** MIDI メッセージのバイト列 → NoteEvent。関係ないメッセージは null（全チャンネルをまとめて扱う） */
export function parseMidiMessage(data: ArrayLike<number>): NoteEvent | null {
  if (data.length < 3) return null
  const command = data[0] & 0xf0
  const d1 = data[1] & 0x7f
  const d2 = data[2] & 0x7f
  if (command === 0x90) {
    return d2 > 0 ? { type: 'noteOn', note: d1, velocity: d2 } : { type: 'noteOff', note: d1 }
  }
  if (command === 0x80) return { type: 'noteOff', note: d1 }
  if (command === 0xb0 && d1 === SUSTAIN_CC) return { type: 'sustain', down: d2 >= PEDAL_DOWN_THRESHOLD }
  return null
}
