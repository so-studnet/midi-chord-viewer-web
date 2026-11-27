import { memo } from 'react'
import { formatNoteName } from '../core/theory/format'
import { isBlackKey } from '../core/theory/noteNames'

/** Fantom-06（61 鍵）の範囲: C2〜C7 */
export const LOWEST_NOTE = 36
export const HIGHEST_NOTE = 96

const WHITE_W = 24
const WHITE_H = 140
const BLACK_W = 14
const BLACK_H = 88

interface Props {
  sounding: ReadonlySet<number>
  physical: ReadonlySet<number>
  keyTonic: number | null
  /** 色分け。search は検索結果用の色 */
  variant?: 'play' | 'search'
}

/** SVG で描く鍵盤。押している鍵は濃い色、ペダルで伸びているだけの音は薄い色 */
export const KeyboardView = memo(function KeyboardView({ sounding, physical, keyTonic, variant = 'play' }: Props) {
  const key = keyTonic === null ? null : { tonic: keyTonic }
  const name = (n: number) => formatNoteName(n, { key })
  const whites: { note: number; x: number }[] = []
  const blacks: { note: number; x: number }[] = []
  let wi = 0
  for (let n = LOWEST_NOTE; n <= HIGHEST_NOTE; n++) {
    if (isBlackKey(n)) blacks.push({ note: n, x: wi * WHITE_W - BLACK_W / 2 })
    else whites.push({ note: n, x: wi++ * WHITE_W })
  }
  const width = wi * WHITE_W
  const state = (n: number) => (physical.has(n) ? 'pressed' : sounding.has(n) ? 'sustained' : '')

  return (
    <svg className={`keyboard ${variant}`} viewBox={`0 0 ${width} ${WHITE_H}`} role="img" aria-label="鍵盤">
      {whites.map(({ note, x }) => (
        <g key={note} className={`key white ${state(note)}`} data-note={note}>
          <rect x={x + 0.5} y={0.5} width={WHITE_W - 1} height={WHITE_H - 1} rx={3} />
          {sounding.has(note) && (
            <text x={x + WHITE_W / 2} y={WHITE_H - 10} textAnchor="middle">
              {name(note)}
            </text>
          )}
          {!sounding.has(note) && note % 12 === 0 && (
            <text className="octave" x={x + WHITE_W / 2} y={WHITE_H - 10} textAnchor="middle">
              {name(note)}
            </text>
          )}
        </g>
      ))}
      {blacks.map(({ note, x }) => (
        <g key={note} className={`key black ${state(note)}`} data-note={note}>
          <rect x={x} y={0} width={BLACK_W} height={BLACK_H} rx={2} />
          {sounding.has(note) && (
            <text x={x + BLACK_W / 2} y={BLACK_H - 8} textAnchor="middle">
              {name(note).replace(/-?\d+$/, '')}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
})
