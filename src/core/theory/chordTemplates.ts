export interface ChordTemplate {
  /** ルート音名のあとに付ける表記（例: "m7"） */
  readonly suffix: string
  /** ルートからの音程を 12bit のビット集合で表したもの */
  readonly mask: number
  readonly noteCount: number
}

function template(suffix: string, ...intervals: number[]): ChordTemplate {
  let mask = 0
  for (const i of intervals) mask |= 1 << (i % 12)
  return { suffix, mask, noteCount: bitCount(mask) }
}

export function bitCount(n: number): number {
  let c = 0
  for (let v = n; v !== 0; v &= v - 1) c++
  return c
}

/** 並び順は判定の優先順位に影響する（同点なら先にあるものが勝つ）。Java 版と同じ順序 */
export const CHORD_TEMPLATES: readonly ChordTemplate[] = [
  template('', 0, 4, 7),
  template('m', 0, 3, 7),
  template('dim', 0, 3, 6),
  template('aug', 0, 4, 8),
  template('sus2', 0, 2, 7),
  template('sus4', 0, 5, 7),
  template('6', 0, 4, 7, 9),
  template('m6', 0, 3, 7, 9),
  template('7', 0, 4, 7, 10),
  template('7sus4', 0, 5, 7, 10),
  template('maj7', 0, 4, 7, 11),
  template('m7', 0, 3, 7, 10),
  template('m7-5', 0, 3, 6, 10),
  template('dim7', 0, 3, 6, 9),
  template('m(maj7)', 0, 3, 7, 11),
  template('aug7', 0, 4, 8, 10),
  template('add9', 0, 2, 4, 7),
  template('madd9', 0, 2, 3, 7),
  template('9', 0, 2, 4, 7, 10),
  template('maj9', 0, 2, 4, 7, 11),
  template('m9', 0, 2, 3, 7, 10),
  template('7(b9)', 0, 1, 4, 7, 10),
  template('7(#9)', 0, 3, 4, 7, 10),
  template('7(b5)', 0, 4, 6, 10),
  template('7(#11)', 0, 4, 6, 7, 10),
  template('11', 0, 2, 5, 7, 10),
  template('m11', 0, 2, 3, 5, 7, 10),
  template('13', 0, 2, 4, 7, 9, 10),
  template('m13', 0, 2, 3, 7, 9, 10),
  template('maj13', 0, 2, 4, 7, 9, 11),
]
