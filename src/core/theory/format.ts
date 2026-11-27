import type { ChordResult } from './chordAnalyzer'
import type { ChordTemplate } from './chordTemplates'
import { intervalName } from './intervals'
import { pitchClassOf } from './noteNames'
import { accidentals, spellPitchClass, type AccidentalStyle, type Key } from './spelling'

export interface FormatOptions {
  /** null なら Java 版と同じく ♯ だけで書く */
  readonly key: Key | null
  readonly style?: AccidentalStyle
}

/** MIDI ノート番号 → "C4" / "B♭3" */
export function formatNoteName(midiNote: number, { key, style = 'unicode' }: FormatOptions): string {
  return spellPitchClass(midiNote, key, style) + (Math.floor(midiNote / 12) - 1)
}

/** 判定結果 → 画面に出すコード名など（Java 版の表示と同じ書式） */
export function formatChordName(r: ChordResult, opts: FormatOptions): string {
  const { key, style = 'unicode' } = opts
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
      let label = spellPitchClass(r.root, key, style) + suffix(r.template, style)
      if (r.bass !== r.root) label += '/' + spellPitchClass(r.bass, key, style)
      return r.approximate ? label + '(?)' : label
    }
  }
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
export function formatDegree(r: ChordResult, key: Key, style: AccidentalStyle = 'unicode'): string | null {
  if (r.kind !== 'chord') return null
  let label = romanDegree(r.root - key.tonic, style) + suffix(r.template, style)
  if (r.bass !== r.root) label += '/' + romanDegree(r.bass - key.tonic, style)
  return r.approximate ? label + '(?)' : label
}

function suffix(t: ChordTemplate, style: AccidentalStyle): string {
  return accidentals(t.suffix, style)
}
