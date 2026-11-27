import type { ChordResult } from './chordAnalyzer'
import type { ChordTemplate, NotationStyle } from './chordTemplates'
import { spellBass } from './chordSpelling'
import { intervalName } from './intervals'
import { pitchClassOf } from './noteNames'
import { accidentals, spellPitchClass, type AccidentalStyle, type Key } from './spelling'

export interface FormatOptions {
  /** null なら Java 版と同じく ♯ だけで書く */
  readonly key: Key | null
  readonly style?: AccidentalStyle
  /** コードの種類の書き方（既定は標準。Java 版と同じ） */
  readonly notation?: NotationStyle
}

/** MIDI ノート番号 → "C4" / "B♭3" */
export function formatNoteName(midiNote: number, { key, style = 'unicode' }: FormatOptions): string {
  return spellPitchClass(midiNote, key, style) + (Math.floor(midiNote / 12) - 1)
}

/** 判定結果 → 画面に出すコード名など（Java 版の表示と同じ書式） */
export function formatChordName(r: ChordResult, opts: FormatOptions): string {
  switch (r.kind) {
    case 'none':
      return '-'
    case 'singleNote':
      return formatNoteName(r.note, opts)
    case 'interval':
      return `${formatNoteName(r.low, opts)} - ${formatNoteName(r.high, opts)} (${intervalName(r.high - r.low)})`
    case 'unresolved':
      return '該当コードなし'
    case 'chord': {
      const label = chordSymbol(r.root, r.template, r.bass, opts)
      return r.approximate ? label + '(?)' : label
    }
  }
}

/** ルート・種類・ベース → コード名（例: "B♭m7/F"） */
export function chordSymbol(root: number, template: ChordTemplate, bass: number, opts: FormatOptions): string {
  const { key, style = 'unicode', notation = 'standard' } = opts
  let label = spellPitchClass(root, key, style) + suffix(template, style, notation)
  if (pitchClassOf(bass) !== pitchClassOf(root)) label += '/' + spellBass(root, template.mask, bass, key, style)
  return label
}

const ROMAN = ['I', 'bII', 'II', 'bIII', 'III', 'IV', '#IV', 'V', 'bVI', 'VI', 'bVII', 'VII'] as const

/** 主音からの半音数 → 度数（"I" "♭VII" など） */
export function romanDegree(interval: number, style: AccidentalStyle = 'unicode'): string {
  const r = ROMAN[pitchClassOf(interval)]
  return style === 'ascii' ? r : r.replace('b', '♭').replace('#', '♯')
}

/**
 * 度数表記（ディグリー）。コードでなければ null。
 * 例: キー C で Dm7 → "IIm7"、G7/B → "V7/VII"、B♭ → "♭VII"
 */
export function formatDegree(
  r: ChordResult,
  key: Key,
  style: AccidentalStyle = 'unicode',
  notation: NotationStyle = 'standard',
): string | null {
  if (r.kind !== 'chord') return null
  const label = degreeSymbol(r.root, r.template, r.bass, key, style, notation)
  return r.approximate ? label + '(?)' : label
}

/** ルート・種類・ベース → 度数表記（例: "IIm7/VI"） */
export function degreeSymbol(
  root: number,
  template: ChordTemplate,
  bass: number,
  key: Key,
  style: AccidentalStyle = 'unicode',
  notation: NotationStyle = 'standard',
): string {
  let label = romanDegree(root - key.tonic, style) + suffix(template, style, notation)
  if (pitchClassOf(bass) !== pitchClassOf(root)) label += '/' + romanDegree(bass - key.tonic, style)
  return label
}

function suffix(t: ChordTemplate, style: AccidentalStyle, notation: NotationStyle): string {
  return accidentals(t.names[notation], style)
}
