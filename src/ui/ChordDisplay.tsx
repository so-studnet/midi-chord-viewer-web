import { memo } from 'react'
import { analyzeChord } from '../core/theory/chordAnalyzer'
import { fullName } from '../core/theory/noteNames'

export const ChordDisplay = memo(function ChordDisplay({ sounding }: { sounding: ReadonlySet<number> }) {
  const chord = analyzeChord(sounding)
  const notes = [...sounding].sort((a, b) => a - b).map(fullName).join(', ')
  return (
    <section className={`chord kind-${chord.kind}`} aria-live="polite">
      <div className="chord-label" data-testid="chord-label">
        {chord.label}
      </div>
      <div className="chord-notes">{notes || ' '}</div>
    </section>
  )
})
