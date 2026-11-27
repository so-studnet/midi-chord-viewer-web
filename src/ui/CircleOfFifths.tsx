import { memo, useEffect, useState } from 'react'
import { analyzeChord } from '../core/theory/chordAnalyzer'
import type { NotationStyle } from '../core/theory/chordTemplates'
import {
  diatonicDegrees,
  keySignature,
  placeChord,
  placementKey,
  pushTrail,
  segmentLabel,
  type Placement,
  type Ring,
} from '../core/theory/circleOfFifths'
import { pitchClassOf } from '../core/theory/noteNames'
import { keyName } from '../core/theory/spelling'

const SIZE = 420
const C = SIZE / 2
const RADII: Record<Ring | 'sig', [number, number]> = {
  sig: [184, 204],
  major: [134, 184],
  minor: [92, 134],
  dim: [58, 92],
}
const RINGS: Ring[] = ['major', 'minor', 'dim']
/** 押してから何ミリ秒同じコードが続いたら履歴に入れるか（押している途中の和音を数えない） */
const STABLE_MS = 150

interface Props {
  sounding: ReadonlySet<number>
  keyTonic: number | null
  notation: NotationStyle
  showNotes: boolean
  onSelect: (p: Placement) => void
}

/** 5 度圏。今のコードのマス・キーのダイアトニック（扇形）・直前のコードからの矢印・弾いている音の点を示す */
export const CircleOfFifths = memo(function CircleOfFifths({ sounding, keyTonic, notation, showNotes, onSelect }: Props) {
  const current = placeChord(analyzeChord(sounding))
  const currentKey = current ? placementKey(current) : null
  const trail = useTrail(current)
  const degrees = keyTonic === null ? new Map<string, string>() : diatonicDegrees(keyTonic, notation)
  const notePositions = new Set([...sounding].map((n) => pitchClassOf(n * 7)))

  return (
    <svg className="circle" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="5 度圏">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" className="trail-head" />
        </marker>
      </defs>

      {Array.from({ length: 12 }, (_, index) => (
        <g key={`sig${index}`} className="sig">
          <path d={sector(index, ...RADII.sig)} />
          <text {...labelPos(index, RADII.sig)} textAnchor="middle" dominantBaseline="central">
            {keySignature(index)}
          </text>
        </g>
      ))}

      {RINGS.map((ring) =>
        Array.from({ length: 12 }, (_, index) => {
          const p = { ring, index }
          const k = placementKey(p)
          const degree = degrees.get(k)
          const cls = ['seg', ring, degree ? 'in-key' : '', k === currentKey ? 'current' : ''].join(' ')
          const pos = labelPos(index, RADII[ring])
          return (
            <g key={k} className={cls} data-seg={k} onClick={() => onSelect(p)} role="button" aria-label={segmentLabel(p, notation)}>
              <path d={sector(index, ...RADII[ring])} />
              <text x={pos.x} y={degree ? pos.y - 6 : pos.y} textAnchor="middle" dominantBaseline="central" className="name">
                {shortLabel(segmentLabel(p, notation), ring)}
              </text>
              {degree && (
                <text x={pos.x} y={pos.y + 9} textAnchor="middle" dominantBaseline="central" className="degree">
                  {degree}
                </text>
              )}
            </g>
          )
        }),
      )}

      {trail.slice(1).map((p, i) => {
        // 文字にかぶらないよう両端を少し縮める
        const [from, to] = shorten(centroid(trail[i]), centroid(p), 14)
        const age = trail.length - 2 - i // 0 が最新
        return (
          <line
            key={`${placementKey(trail[i])}-${placementKey(p)}-${i}`}
            className="trail"
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            markerEnd="url(#arrow)"
            style={{ opacity: 1 - age * 0.28 }}
          />
        )
      })}

      {showNotes &&
        [...notePositions].map((index) => {
          const { x, y } = polar(index * 30, RADII.major[1])
          return <circle key={`n${index}`} className="note-dot" cx={x} cy={y} r={5} />
        })}

      <text x={C} y={C - 8} textAnchor="middle" className="center-label">
        Key
      </text>
      <text x={C} y={C + 12} textAnchor="middle" className="center-key">
        {keyTonic === null ? '—' : keyName({ tonic: keyTonic }).replace(' / ', '/')}
      </text>
    </svg>
  )
})

/** 同じコードが少し続いたら履歴に入れる */
function useTrail(current: Placement | null): Placement[] {
  const [trail, setTrail] = useState<Placement[]>([])
  const key = current ? placementKey(current) : null
  useEffect(() => {
    if (!current) return
    const id = setTimeout(() => setTrail((t) => pushTrail(t, current)), STABLE_MS)
    return () => clearTimeout(id)
    // current の中身は key で決まるので key だけを見る
  }, [key]) // oxlint-disable-line react-hooks/exhaustive-deps
  return trail
}

/** 内側の輪は狭いので、m7-5 系は短く書く（F♯m7-5/G♭m7-5 のような長い名前を避ける） */
function shortLabel(label: string, ring: Ring): string {
  if (ring !== 'dim') return label
  return label.replace(/(m7-5|m7\(♭5\))(?=\/|$)/g, 'ø')
}

function polar(angleDeg: number, r: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) }
}

function sector(index: number, r0: number, r1: number): string {
  const a0 = index * 30 - 15
  const a1 = index * 30 + 15
  const p0 = polar(a0, r1)
  const p1 = polar(a1, r1)
  const p2 = polar(a1, r0)
  const p3 = polar(a0, r0)
  return `M ${p0.x} ${p0.y} A ${r1} ${r1} 0 0 1 ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${r0} ${r0} 0 0 0 ${p3.x} ${p3.y} Z`
}

function labelPos(index: number, [r0, r1]: [number, number]) {
  return polar(index * 30, (r0 + r1) / 2)
}

function centroid(p: Placement) {
  return labelPos(p.index, RADII[p.ring])
}

function shorten(a: { x: number; y: number }, b: { x: number; y: number }, by: number) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len <= by * 2) return [a, b]
  const ux = (dx / len) * by
  const uy = (dy / len) * by
  return [
    { x: a.x + ux, y: a.y + uy },
    { x: b.x - ux, y: b.y - uy },
  ]
}
