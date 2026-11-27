/** Salamander Grand Piano のサンプル配置（純粋関数。テスト対象） */

/** 用意している強さのレイヤー（Salamander は 1〜16。全部読むと重いので 4 つに間引いている） */
export const VELOCITY_LAYERS = [4, 8, 12, 16] as const
export type VelocityLayer = (typeof VELOCITY_LAYERS)[number]

const NAME_OF_PC: Record<number, string> = { 0: 'C', 3: 'Ds', 6: 'Fs', 9: 'A' }

/** サンプルがある音（A0〜C8 の短3度おき）の MIDI ノート番号 */
export const SAMPLED_NOTES: readonly number[] = (() => {
  const notes: number[] = []
  for (let n = 21; n <= 108; n++) if (n % 3 === 0) notes.push(n)
  return notes
})()

export function sampleFileName(note: number, layer: VelocityLayer): string {
  return `${NAME_OF_PC[note % 12]}${Math.floor(note / 12) - 1}v${layer}.ogg`
}

/** 鳴らしたい音に一番近いサンプルの音（同じ距離なら下の音。上に伸ばすほうが音質の劣化が少ない） */
export function nearestSampledNote(note: number): number {
  let best = SAMPLED_NOTES[0]
  for (const s of SAMPLED_NOTES) if (Math.abs(s - note) < Math.abs(best - note)) best = s
  return best
}

/**
 * ベロシティ（1〜127）→ 使うレイヤーと音量の補正。
 * 読み込み済みのレイヤーの中から一番近いものを選び、レイヤー間の差を音量で埋める。
 */
export function chooseLayer(
  velocity: number,
  available: readonly VelocityLayer[],
): { layer: VelocityLayer; gain: number } | null {
  if (available.length === 0) return null
  const ideal = (Math.max(1, Math.min(127, velocity)) / 127) * 16
  let layer = available[0]
  for (const l of available) if (Math.abs(l - ideal) < Math.abs(layer - ideal)) layer = l
  // レイヤー番号を音の大きさの目安として、足りない・多すぎる分を少しだけ補う
  const gain = Math.min(1.6, Math.max(0.5, Math.pow(ideal / layer, 0.8)))
  return { layer, gain }
}
