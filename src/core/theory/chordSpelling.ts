import { pitchClassOf } from './noteNames'
import { accidentals, spellPitchClass, type AccidentalStyle, type Key } from './spelling'

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11] as const

/**
 * コードの構成音を、ルートからの音程に合った音名で書く（例: G7(♭9) の ♭9 は G♯ ではなく A♭）。
 * ルートの書き方は key に従う。戻り値はルートから順（mask の音程順）。
 */
export function spellChordTones(root: number, mask: number, key: Key | null, style: AccidentalStyle = 'unicode'): string[] {
  const rootName = spellPitchClass(root, key, 'ascii')
  const rootLetter = LETTERS.indexOf(rootName[0] as (typeof LETTERS)[number])
  const has = (i: number) => (mask & (1 << i)) !== 0
  const names: string[] = []
  for (let i = 0; i < 12; i++) {
    if (!has(i)) continue
    const pc = pitchClassOf(root + i)
    const letter = (rootLetter + letterOffset(i, has)) % 7
    let acc = pc - LETTER_PC[letter]
    if (acc > 6) acc -= 12
    if (acc < -6) acc += 12
    const name =
      Math.abs(acc) > 1 ? spellPitchClass(pc, key, 'ascii') : LETTERS[letter] + (acc === 1 ? '#' : acc === -1 ? 'b' : '')
    names.push(accidentals(name, style))
  }
  return names
}

/** ルートから何文字先の音名になるか（音程の度数 - 1） */
function letterOffset(interval: number, has: (i: number) => boolean): number {
  switch (interval) {
    case 0:
      return 0
    case 1: // ♭9
    case 2: // 9 / sus2
      return 1
    case 3: // 長3度もあれば ♯9、なければ短3度
      return has(4) ? 1 : 2
    case 4:
      return 2
    case 5: // 11 / sus4
      return 3
    case 6: // 完全5度もあれば ♯11、なければ ♭5
      return has(7) ? 3 : 4
    case 7:
      return 4
    case 8: // 完全5度もあれば ♭13、なければ ♯5
      return has(7) ? 5 : 4
    case 9: // 6 / 13（dim7 の 𝄫7 も 6 と書く）
      return 5
    default: // ♭7 / 7
      return 6
  }
}

/**
 * 分数コードのベース音の書き方。ベースが構成音なら構成音と同じ書き方（B♭aug7 の 7th は A♭）、
 * 構成音でなければキーに合わせた書き方（Daug/G♯ の G♯）。
 */
export function spellBass(root: number, mask: number, bass: number, key: Key | null, style: AccidentalStyle = 'unicode'): string {
  const interval = pitchClassOf(bass - root)
  if ((mask & (1 << interval)) === 0) return spellPitchClass(bass, key, style)
  let index = 0
  for (let i = 0; i < interval; i++) if (mask & (1 << i)) index++
  return spellChordTones(root, mask, key, style)[index]
}
