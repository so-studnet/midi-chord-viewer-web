import { pitchClassOf } from './noteNames'

/**
 * キー。平行長調を基準にするので、長調の主音だけで表す（Am の曲は tonic = C）。
 */
export interface Key {
  /** 長調の主音のピッチクラス（0〜11） */
  readonly tonic: number
}

/** 臨時記号の書き方。unicode は ♯♭、ascii は #b（Java 版と同じ） */
export type AccidentalStyle = 'unicode' | 'ascii'

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11] as const

/**
 * 主音（0〜11）→ [音名の文字の番号, 臨時記号]。調号の少ない書き方を選ぶ（F♯ と G♭ は F♯）。
 * 主音から見た半音数 → [音階の何番目か, 臨時記号] も同じ表になる（♭II ♭III ♯IV ♭VI ♭VII）。
 */
const SPELL_TABLE: readonly (readonly [number, number])[] = [
  [0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [3, 1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0],
]

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
/** フラット系のキー（D♭ E♭ F A♭ B♭） */
const FLAT_KEYS = new Set([1, 3, 5, 8, 10])

/**
 * ピッチクラスの音名。key があればキーに合わせて ♯/♭ を選ぶ（例: キー F の 10 → B♭）。
 * key が null なら Java 版と同じくすべて ♯ で書く。
 */
export function spellPitchClass(pc: number, key: Key | null, style: AccidentalStyle = 'unicode'): string {
  const p = pitchClassOf(pc)
  if (!key) return accidentals(SHARP_NAMES[p], style)
  const [tonicLetter] = SPELL_TABLE[key.tonic]
  const [degree] = SPELL_TABLE[pitchClassOf(p - key.tonic)]
  const letter = (tonicLetter + degree) % 7
  let acc = p - LETTER_PC[letter]
  if (acc > 6) acc -= 12
  if (acc < -6) acc += 12
  // ダブルシャープ・ダブルフラットになる場合は、キーの系統に合わせた単純な書き方にする
  if (Math.abs(acc) > 1) return accidentals((FLAT_KEYS.has(key.tonic) ? FLAT_NAMES : SHARP_NAMES)[p], style)
  return accidentals(LETTERS[letter] + (acc === 1 ? '#' : acc === -1 ? 'b' : ''), style)
}

/** キーの表示名。例: "C / Am"、"E♭ / Cm" */
export function keyName(key: Key, style: AccidentalStyle = 'unicode'): string {
  return `${spellPitchClass(key.tonic, key, style)} / ${spellPitchClass(key.tonic + 9, key, style)}m`
}

/** 音名・コードの表記の #/b を記法に合わせて書き換える（音名の直後か括弧内のテンションだけ） */
export function accidentals(text: string, style: AccidentalStyle): string {
  if (style === 'ascii') return text
  return text.replace(/([A-G])#/g, '$1♯').replace(/([A-G])b/g, '$1♭').replace(/\(#/g, '(♯').replace(/\(b/g, '(♭')
}
