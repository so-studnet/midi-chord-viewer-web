import { bitCount, CHORD_TEMPLATES, type ChordTemplate } from './chordTemplates'
import { pitchClassOf } from './noteNames'

/**
 * 判定結果。表示用の文字列は持たず、部品（ルート・種類・ベース音）だけを返す。
 * 文字列にするのは format.ts（キーや記法に合わせて書き分ける）。
 */
export type ChordResult =
  | { readonly kind: 'none' }
  | { readonly kind: 'singleNote'; readonly note: number }
  | { readonly kind: 'interval'; readonly low: number; readonly high: number }
  | {
      readonly kind: 'chord'
      /** ルートのピッチクラス（0〜11） */
      readonly root: number
      readonly template: ChordTemplate
      /** 最低音のピッチクラス。root と違えば分数コード */
      readonly bass: number
      /** 近似候補（完全一致するコードがなかった）なら true */
      readonly approximate: boolean
    }
  | { readonly kind: 'unresolved' }

export type ChordKind = ChordResult['kind']

const APPROXIMATE_MATCH_THRESHOLD = 3

interface Match {
  root: number
  template: ChordTemplate
  score: number
  matched: number
}

/**
 * 鳴っている音（MIDI ノート番号）からコードを判定する。
 * Java 版 ChordAnalyzer と同じ結果になるように移植している（tests で突き合わせ済み）。
 * 表示用の文字列は formatChordName() で作る。
 */
export function analyzeChord(notes: Iterable<number>): ChordResult {
  const sorted = [...new Set(notes)].sort((a, b) => a - b)
  if (sorted.length === 0) return { kind: 'none' }
  if (sorted.length === 1) return { kind: 'singleNote', note: sorted[0] }
  if (sorted.length === 2) return { kind: 'interval', low: sorted[0], high: sorted[1] }

  const bass = pitchClassOf(sorted[0])
  let mask = 0
  for (const n of sorted) mask |= 1 << pitchClassOf(n)

  const exact = findBestExactMatch(mask, bass)
  if (exact) return { kind: 'chord', root: exact.root, template: exact.template, bass, approximate: false }

  const approx = findBestApproximateMatch(mask)
  if (approx && approx.matched >= APPROXIMATE_MATCH_THRESHOLD) {
    return { kind: 'chord', root: approx.root, template: approx.template, bass, approximate: true }
  }
  return { kind: 'unresolved' }
}

function rotate(mask: number, root: number): number {
  return ((mask >> root) | (mask << (12 - root))) & 0xfff
}

function findBestExactMatch(mask: number, bassPitchClass: number): Match | null {
  let best: Match | null = null
  for (let root = 0; root < 12; root++) {
    if ((mask & (1 << root)) === 0) continue
    const rotated = rotate(mask, root)
    for (const t of CHORD_TEMPLATES) {
      if (rotated !== t.mask) continue
      const candidate: Match = { root, template: t, score: t.noteCount * 10, matched: t.noteCount }
      if (!best || isBetterExact(candidate, best, bassPitchClass)) best = candidate
    }
  }
  return best
}

function isBetterExact(candidate: Match, current: Match, bassPitchClass: number): boolean {
  const candidateIsBass = candidate.root === bassPitchClass
  const currentIsBass = current.root === bassPitchClass
  if (candidateIsBass !== currentIsBass) return candidateIsBass
  return candidate.score > current.score
}

function findBestApproximateMatch(mask: number): Match | null {
  let best: Match | null = null
  for (let root = 0; root < 12; root++) {
    if ((mask & (1 << root)) === 0) continue
    const rotated = rotate(mask, root)
    for (const t of CHORD_TEMPLATES) {
      const matched = bitCount(rotated & t.mask)
      const missing = bitCount(t.mask & ~rotated)
      const extra = bitCount(rotated & ~t.mask)
      const score = matched * 2 - missing - extra * 2
      if (!best || score > best.score) best = { root, template: t, score, matched }
    }
  }
  return best
}
