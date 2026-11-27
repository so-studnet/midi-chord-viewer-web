import { INITIAL_KEY_DETECTOR, stepKeyDetector, type KeyDetectorState } from '../core/key/keyDetector'
import { applyEvent, EMPTY_KEYBOARD, type KeyboardState } from '../core/input/keyboardState'
import type { NoteEvent } from '../core/input/noteEvent'
import type { Key } from '../core/theory/spelling'

export type KeyMode = { readonly mode: 'auto' } | { readonly mode: 'manual'; readonly tonic: number }

export interface KeySnapshot {
  readonly mode: KeyMode
  /** 自動判定の結果（まだ決まっていなければ null） */
  readonly detected: Key | null
  /** 表示に使うキー（手動ならそれ、自動なら判定結果） */
  readonly effective: Key | null
}

/** 判定を進める間隔（ミリ秒）。キーは 1 フレームごとに追う必要はない */
const TICK_MS = 250

/**
 * キーの自動判定と手動指定を持つストア。MIDI イベントを受けて判定を進め、
 * 音が鳴っている間は一定間隔で「鳴っていた時間」を数える。
 */
export class KeyStore {
  private keyboard: KeyboardState = EMPTY_KEYBOARD
  private detector: KeyDetectorState = INITIAL_KEY_DETECTOR
  private pendingOnsets: number[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private snapshot: KeySnapshot
  private readonly listeners = new Set<() => void>()
  private readonly now: () => number

  constructor(initialMode: KeyMode, now: () => number = () => performance.now() / 1000) {
    this.snapshot = makeSnapshot(initialMode, null)
    this.now = now
  }

  dispatch = (event: NoteEvent): void => {
    this.keyboard = applyEvent(this.keyboard, event)
    if (event.type === 'noteOn') this.pendingOnsets.push(event.note)
    this.step()
    if (this.keyboard.sounding.size > 0) this.timer ??= setInterval(this.step, TICK_MS)
  }

  private step = (): void => {
    this.detector = stepKeyDetector(this.detector, {
      time: this.now(),
      sounding: this.keyboard.sounding,
      onsets: this.pendingOnsets,
    })
    this.pendingOnsets = []
    if (this.keyboard.sounding.size === 0 && this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
    const detected = this.detector.tonic
    if (detected !== (this.snapshot.detected?.tonic ?? null)) {
      this.publish(makeSnapshot(this.snapshot.mode, detected))
    }
  }

  setMode(mode: KeyMode): void {
    this.publish(makeSnapshot(mode, this.snapshot.detected?.tonic ?? null))
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): KeySnapshot => this.snapshot

  private publish(s: KeySnapshot): void {
    this.snapshot = s
    for (const l of this.listeners) l()
  }
}

function makeSnapshot(mode: KeyMode, detectedTonic: number | null): KeySnapshot {
  const detected = detectedTonic === null ? null : { tonic: detectedTonic }
  return { mode, detected, effective: mode.mode === 'manual' ? { tonic: mode.tonic } : detected }
}
