import type { NoteEvent } from './noteEvent'

/** 鍵盤の状態。変更のたびに新しいオブジェクトを返す（中身は書き換えない） */
export interface KeyboardState {
  /** 指で押さえている音 */
  readonly physical: ReadonlySet<number>
  /** 鳴っている音（押さえている音＋ペダルで伸びている音）。表示・判定・発音はこれを使う */
  readonly sounding: ReadonlySet<number>
  readonly sustainDown: boolean
}

export const EMPTY_KEYBOARD: KeyboardState = { physical: new Set(), sounding: new Set(), sustainDown: false }

export function applyEvent(state: KeyboardState, ev: NoteEvent): KeyboardState {
  switch (ev.type) {
    case 'noteOn':
      return {
        ...state,
        physical: withNote(state.physical, ev.note),
        sounding: withNote(state.sounding, ev.note),
      }
    case 'noteOff': {
      const physical = withoutNote(state.physical, ev.note)
      const sounding = state.sustainDown ? state.sounding : withoutNote(state.sounding, ev.note)
      return { ...state, physical, sounding }
    }
    case 'sustain': {
      if (ev.down) return state.sustainDown ? state : { ...state, sustainDown: true }
      const sounding = new Set([...state.sounding].filter((n) => state.physical.has(n)))
      return { ...state, sustainDown: false, sounding }
    }
  }
}

/** prev では鳴っていて next では鳴っていない音（＝止めるべき音） */
export function releasedNotes(prev: KeyboardState, next: KeyboardState): number[] {
  return [...prev.sounding].filter((n) => !next.sounding.has(n))
}

function withNote(set: ReadonlySet<number>, note: number): ReadonlySet<number> {
  if (set.has(note)) return set
  const s = new Set(set)
  s.add(note)
  return s
}

function withoutNote(set: ReadonlySet<number>, note: number): ReadonlySet<number> {
  if (!set.has(note)) return set
  const s = new Set(set)
  s.delete(note)
  return s
}
