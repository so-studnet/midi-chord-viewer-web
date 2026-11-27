import { applyEvent, EMPTY_KEYBOARD, type KeyboardState } from '../core/input/keyboardState'
import type { NoteEvent } from '../core/input/noteEvent'

/**
 * 画面用の鍵盤の状態。状態はイベントのたびに更新するが、画面への通知は
 * 1 フレームに 1 回にまとめる（和音を弾いたときに何度も描き直さない）。
 */
export class KeyboardStore {
  private state: KeyboardState = EMPTY_KEYBOARD
  private readonly listeners = new Set<() => void>()
  private frame: number | null = null

  dispatch = (event: NoteEvent): void => {
    this.state = applyEvent(this.state, event)
    if (this.frame === null) {
      this.frame = requestAnimationFrame(() => {
        this.frame = null
        for (const l of this.listeners) l()
      })
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): KeyboardState => this.state
}
