import { memo } from 'react'
import { analyzeChord } from '../core/theory/chordAnalyzer'
import { formatChordName, formatDegree, formatNoteName } from '../core/theory/format'
import type { Key } from '../core/theory/spelling'
import { MusicText } from './MusicText'

interface Props {
  sounding: ReadonlySet<number>
  keyTonic: number | null
}

export const ChordDisplay = memo(function ChordDisplay({ sounding, keyTonic }: Props) {
  const key: Key | null = keyTonic === null ? null : { tonic: keyTonic }
  const chord = analyzeChord(sounding)
  const notes = [...sounding]
    .sort((a, b) => a - b)
    .map((n) => formatNoteName(n, { key }))
    .join(', ')
  const degree = key ? formatDegree(chord, key) : null
  return (
    <section className={`chord kind-${chord.kind}`} aria-live="polite">
      <div className="chord-label" data-testid="chord-label">
        <MusicText text={formatChordName(chord, { key })} />
      </div>
      <div className="chord-degree" data-testid="chord-degree">
        {degree ? <MusicText text={degree} /> : '\u00a0'}
      </div>
      <div className="chord-notes">{notes ? <MusicText text={notes} /> : '\u00a0'}</div>
    </section>
  )
})
