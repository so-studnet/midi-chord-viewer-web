/** 表示する記法 */
export type NotationStyle = 'standard' | 'japanese' | 'jazz'

export const NOTATION_STYLES: readonly { id: NotationStyle; label: string; example: string }[] = [
  { id: 'standard', label: '標準', example: 'Cmaj7 / Cm7-5' },
  { id: 'japanese', label: '日本式', example: 'CM7 / Cm7(♭5)' },
  { id: 'jazz', label: 'ジャズ記号', example: 'C△7 / Cø7' },
]

export interface ChordTemplate {
  /** 種類の ID（標準記法の表記と同じ） */
  readonly id: string
  /** ルート音名のあとに付ける表記。臨時記号は ASCII（# b）で持ち、表示のときに ♯♭ に変える */
  readonly names: Readonly<Record<NotationStyle, string>>
  /** ルートからの音程を 12bit のビット集合で表したもの */
  readonly mask: number
  readonly noteCount: number
  /** Web 版で追加した種類（Java 版にはない） */
  readonly addedInWeb: boolean
  /** 近似候補の探索に使うか（2 音だけの種類は使わない） */
  readonly approximate: boolean
}

export function bitCount(n: number): number {
  let c = 0
  for (let v = n; v !== 0; v &= v - 1) c++
  return c
}

type Row = [standard: string, japanese: string, jazz: string, intervals: number[]]

function build(rows: Row[], addedInWeb: boolean): ChordTemplate[] {
  return rows.map(([standard, japanese, jazz, intervals]) => {
    let mask = 0
    for (const i of intervals) mask |= 1 << (i % 12)
    const noteCount = bitCount(mask)
    return {
      id: standard,
      names: { standard, japanese, jazz },
      mask,
      noteCount,
      addedInWeb,
      approximate: noteCount >= 3,
    }
  })
}

/** Java 版と同じ 30 種類。並び順は判定の優先順位に影響する（同点なら先にあるものが勝つ） */
const JAVA_TEMPLATES = build(
  [
    ['', '', '', [0, 4, 7]],
    ['m', 'm', '-', [0, 3, 7]],
    ['dim', 'dim', '°', [0, 3, 6]],
    ['aug', 'aug', '+', [0, 4, 8]],
    ['sus2', 'sus2', 'sus2', [0, 2, 7]],
    ['sus4', 'sus4', 'sus4', [0, 5, 7]],
    ['6', '6', '6', [0, 4, 7, 9]],
    ['m6', 'm6', '-6', [0, 3, 7, 9]],
    ['7', '7', '7', [0, 4, 7, 10]],
    ['7sus4', '7sus4', '7sus4', [0, 5, 7, 10]],
    ['maj7', 'M7', '△7', [0, 4, 7, 11]],
    ['m7', 'm7', '-7', [0, 3, 7, 10]],
    ['m7-5', 'm7(b5)', 'ø7', [0, 3, 6, 10]],
    ['dim7', 'dim7', '°7', [0, 3, 6, 9]],
    ['m(maj7)', 'mM7', '-△7', [0, 3, 7, 11]],
    ['aug7', 'aug7', '+7', [0, 4, 8, 10]],
    ['add9', 'add9', 'add9', [0, 2, 4, 7]],
    ['madd9', 'm(add9)', '-(add9)', [0, 2, 3, 7]],
    ['9', '9', '9', [0, 2, 4, 7, 10]],
    ['maj9', 'M9', '△9', [0, 2, 4, 7, 11]],
    ['m9', 'm9', '-9', [0, 2, 3, 7, 10]],
    ['7(b9)', '7(b9)', '7(b9)', [0, 1, 4, 7, 10]],
    ['7(#9)', '7(#9)', '7(#9)', [0, 3, 4, 7, 10]],
    ['7(b5)', '7(b5)', '7(b5)', [0, 4, 6, 10]],
    ['7(#11)', '7(#11)', '7(#11)', [0, 4, 6, 7, 10]],
    ['11', '11', '11', [0, 2, 5, 7, 10]],
    ['m11', 'm11', '-11', [0, 2, 3, 5, 7, 10]],
    ['13', '13', '13', [0, 2, 4, 7, 9, 10]],
    ['m13', 'm13', '-13', [0, 2, 3, 7, 9, 10]],
    ['maj13', 'M13', '△13', [0, 2, 4, 7, 9, 11]],
  ],
  false,
)

/** Web 版で追加した種類。後ろに置くので、同点のときは Java 版の種類が優先される */
const WEB_TEMPLATES = build(
  [
    ['5', '5', '5', [0, 7]],
    ['6/9', '69', '6/9', [0, 2, 4, 7, 9]],
    ['m6/9', 'm69', '-6/9', [0, 2, 3, 7, 9]],
    ['7sus2', '7sus2', '7sus2', [0, 2, 7, 10]],
    ['7(b13)', '7(b13)', '7(b13)', [0, 4, 7, 8, 10]],
    ['9(#11)', '9(#11)', '9(#11)', [0, 2, 4, 6, 7, 10]],
    ['7(b9,13)', '7(b9,13)', '7(b9,13)', [0, 1, 4, 7, 9, 10]],
    ['7(#9,b13)', '7(#9,b13)', '7(#9,b13)', [0, 3, 4, 7, 8, 10]],
    ['maj7(#5)', 'M7(#5)', '△7(#5)', [0, 4, 8, 11]],
    ['maj7(#11)', 'M7(#11)', '△7(#11)', [0, 4, 6, 7, 11]],
    ['m7(11)', 'm7(11)', '-7(11)', [0, 3, 5, 7, 10]],
    ['m7-5(9)', 'm7(b5,9)', 'ø9', [0, 2, 3, 6, 10]],
  ],
  true,
)

export const CHORD_TEMPLATES: readonly ChordTemplate[] = [...JAVA_TEMPLATES, ...WEB_TEMPLATES]

export function templateById(id: string): ChordTemplate | undefined {
  return CHORD_TEMPLATES.find((t) => t.id === id)
}
