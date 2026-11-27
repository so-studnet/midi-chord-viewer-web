import { bitCount, CHORD_TEMPLATES, type ChordTemplate } from './chordTemplates'
import { intervalName } from './intervals'
import { fullName, pitchClassName, pitchClassOf } from './noteNames'

export type ChordKind = 'none' | 'singleNote' | 'interval' | 'chord' | 'unresolved'

export interface ChordResult {
  readonly kind: ChordKind
  /** 画面に出す文字列 */
  readonly label: string
  /** 近似候補（完全一致するコードがなかった）なら true */
  readonly approximate: boolean
}

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
 */
export function analyzeChord(notes: Iterable<number>): ChordResult {
  const sorted = [...new Set(notes)].sort((a, b) => a - b)
  if (sorted.length === 0) return { kind: 'none', label: '-', approximate: false }
  if (sorted.length === 1) return { kind: 'singleNote', label: fullName(sorted[0]), approximate: false }
  if (sorted.length === 2) {
    const [low, high] = sorted
    return {
      kind: 'interval',
      label: `${fullName(low)} - ${fullName(high)} (${intervalName(high - low)})`,
      approximate: false,
    }
  }

  const bass = sorted[0]
  let mask = 0
  for (const n of sorted) mask |= 1 << pitchClassOf(n)

  const exact = findBestExactMatch(mask, pitchClassOf(bass))
  if (exact) return { kind: 'chord', label: chordLabel(exact.root, exact.template, bass), approximate: false }

  const approx = findBestApproximateMatch(mask)
  if (approx && approx.matched >= APPROXIMATE_MATCH_THRESHOLD) {
    return { kind: 'chord', label: chordLabel(approx.root, approx.template, bass) + '(?)', approximate: true }
  }
  return { kind: 'unresolved', label: '該当コードなし', approximate: false }
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

function chordLabel(root: number, t: ChordTemplate, bass: number): string {
  let label = pitchClassName(root) + t.suffix
  const bassPc = pitchClassOf(bass)
  if (bassPc !== root) label += '/' + pitchClassName(bassPc)
  return label
}
