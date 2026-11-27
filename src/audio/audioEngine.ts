import type { NoteEvent } from '../core/input/noteEvent'

/**
 * 音源の窓口。今はピアノのサンプラーだけだが、将来 SoundFont シンセなどに差し替えられるよう、
 * 画面や入力側はこのインターフェースだけを知っている。
 */
export interface AudioEngine {
  /** 音を出せる状態にする（ブラウザの制約で、クリックなどの操作の中で呼ぶ必要がある） */
  start(): Promise<void>
  /** MIDI 入力から直接呼ばれる。React の描画を待たずにすぐ発音する */
  handle(event: NoteEvent): void
  setVolume(volume: number): void
  setEnabled(enabled: boolean): void
  /** 出力の遅延（秒）。ブラウザが報告する値 */
  latency(): { base: number; output: number } | null
  onStatus(listener: (status: EngineStatus) => void): () => void
}

export type EngineStatus =
  | { readonly state: 'idle' }
  | { readonly state: 'loading'; readonly loaded: number; readonly total: number }
  | { readonly state: 'ready' }
  | { readonly state: 'error'; readonly message: string }
