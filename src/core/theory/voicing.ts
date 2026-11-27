import { pitchClassOf } from './noteNames'

/**
 * ルート・種類・ベースから、鍵盤に示す具体的な音（MIDI ノート番号）を作る。
 * ルートを C4〜B4 に置き、構成音を下から順に積む（基本形の密集配置）。
 * 分数コードのベースは 1 オクターブ下に置く。
 */
export function chordVoicing(root: number, mask: number, bass: number): number[] {
  const rootNote = 60 + pitchClassOf(root)
  const notes: number[] = []
  for (let i = 0; i < 12; i++) if (mask & (1 << i)) notes.push(rootNote + i)
  if (pitchClassOf(bass) !== pitchClassOf(root)) {
    let b = 48 + pitchClassOf(bass)
    if (b >= rootNote - 12 + 12) b -= 12
    notes.unshift(b)
  }
  return notes
}
