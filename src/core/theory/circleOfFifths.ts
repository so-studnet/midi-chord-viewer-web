import type { ChordResult } from './chordAnalyzer'
import type { NotationStyle } from './chordTemplates'
import { pitchClassOf } from './noteNames'
import { spellPitchClass, type AccidentalStyle } from './spelling'

/**
 * 5 度圏（純粋関数）。位置 0〜11 は上（C）から時計回り：C G D A E B F♯ D♭ A♭ E♭ B♭ F。
 * 3 重の輪：外側 = 長調（メジャー系のコード）、中 = 平行短調（マイナー系）、内側 = その長調の VII（ディミニッシュ系）。
 */
export type Ring = 'major' | 'minor' | 'dim'

export interface Placement {
  readonly ring: Ring
  /** 5 度圏の位置（0〜11） */
  readonly index: number
}

/** 長調の主音（ピッチクラス）→ 位置。7 × 7 ≡ 1 (mod 12) なので、位置 → 主音も同じ式 */
export function circleIndex(pc: number): number {
  return pitchClassOf(pc * 7)
}

export function tonicAt(index: number): number {
  return pitchClassOf(index * 7)
}

/** コードの種類（音程のビット集合）→ どの輪に置くか */
export function ringOf(mask: number): Ring {
  const has = (i: number) => (mask & (1 << i)) !== 0
  if (has(4)) return 'major' // 長 3 度があればメジャー系（属七・オーギュメントも含む）
  if (has(3) && has(7)) return 'minor'
  if (has(3) && has(6)) return 'dim' // dim、dim7、m7-5
  return 'major' // sus・パワーコードなど 3 度のないもの
}

/** 判定結果 → 5 度圏のどこに置くか（コードでなければ null） */
export function placeChord(r: ChordResult): Placement | null {
  if (r.kind !== 'chord') return null
  return placeRoot(r.root, ringOf(r.template.mask))
}

export function placeRoot(root: number, ring: Ring): Placement {
  // 短調は平行長調（+3 半音）、VII は主音（+1 半音）と同じ位置
  const majorTonic = ring === 'major' ? root : ring === 'minor' ? root + 3 : root + 1
  return { ring, index: circleIndex(majorTonic) }
}

/** 位置 → その輪のコードのルート */
export function rootAt(placement: Placement): number {
  const t = tonicAt(placement.index)
  return pitchClassOf(placement.ring === 'major' ? t : placement.ring === 'minor' ? t - 3 : t - 1)
}

/** 位置の調号。例: 1 → "♯1"、11 → "♭1"、6 → "♯6/♭6" */
export function keySignature(index: number, style: AccidentalStyle = 'unicode'): string {
  const [sharp, flat] = style === 'unicode' ? ['♯', '♭'] : ['#', 'b']
  if (index === 0) return '0'
  if (index === 6) return `${sharp}6/${flat}6`
  return index < 6 ? `${sharp}${index}` : `${flat}${12 - index}`
}

/** 輪のマスに書くコード名（その長調の書き方で ♯/♭ を選ぶ。F♯/G♭ の位置のメジャー・マイナーは両方を書く） */
export function segmentLabel(p: Placement, notation: NotationStyle, style: AccidentalStyle = 'unicode'): string {
  const suffix = qualitySuffix(p.ring, notation)
  const root = rootAt(p)
  if (p.index !== 6) return spellPitchClass(root, { tonic: tonicAt(p.index) }, style) + suffix
  const sharp = spellPitchClass(root, null, style) // F♯ / D♯ / F
  const flat = spellPitchClass(root, { tonic: 5 }, style) // G♭ / E♭ / F（キー F の書き方は ♭ 系）
  return sharp === flat ? sharp + suffix : `${sharp}${suffix}/${flat}${suffix}`
}

/** 各輪の基本の書き方（メジャー・マイナー・m7-5） */
export function qualitySuffix(ring: Ring, notation: NotationStyle): string {
  if (ring === 'major') return ''
  if (ring === 'minor') return notation === 'jazz' ? '-' : 'm'
  return notation === 'jazz' ? 'ø' : notation === 'japanese' ? 'm7(♭5)' : 'm7-5'
}

/**
 * キーのダイアトニックコードの位置と度数。キーの主音の位置を k とすると、
 * 外側 k-1, k, k+1 = IV I V、中 k-1, k, k+1 = IIm VIm IIIm、内側 k = VIIm7-5。
 */
export function diatonicDegrees(keyTonic: number, notation: NotationStyle): Map<string, string> {
  const k = circleIndex(keyTonic)
  const at = (offset: number) => pitchClassOf(k + offset)
  const m = notation === 'jazz' ? '-' : 'm'
  const map = new Map<string, string>()
  map.set(placementKey({ ring: 'major', index: at(-1) }), 'IV')
  map.set(placementKey({ ring: 'major', index: at(0) }), 'I')
  map.set(placementKey({ ring: 'major', index: at(1) }), 'V')
  map.set(placementKey({ ring: 'minor', index: at(-1) }), `II${m}`)
  map.set(placementKey({ ring: 'minor', index: at(0) }), `VI${m}`)
  map.set(placementKey({ ring: 'minor', index: at(1) }), `III${m}`)
  map.set(placementKey({ ring: 'dim', index: at(0) }), 'VII' + qualitySuffix('dim', notation))
  return map
}

export function placementKey(p: Placement): string {
  return `${p.ring}:${p.index}`
}

/** コードの履歴（5 度圏の矢印用）。同じ位置が続いたら足さない。新しいものが最後 */
export function pushTrail(trail: readonly Placement[], p: Placement, max = 4): Placement[] {
  const last = trail.at(-1)
  if (last && last.ring === p.ring && last.index === p.index) return [...trail]
  return [...trail, p].slice(-max)
}
