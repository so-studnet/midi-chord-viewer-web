import { parseMidiMessage, type NoteEvent } from '../core/input/noteEvent'

export interface MidiDeviceInfo {
  readonly id: string
  readonly name: string
}

export type MidiAccessState =
  | { readonly state: 'unsupported' }
  | { readonly state: 'pending' }
  | { readonly state: 'denied'; readonly message: string }
  | { readonly state: 'granted'; readonly devices: readonly MidiDeviceInfo[] }

/**
 * Web MIDI の入力。選んだ 1 台の入力を NoteEvent にして配る。
 * 受け取ったイベントは描画を待たずにすぐ listener に渡す（音源はここから直接鳴らす）。
 */
export class MidiInput {
  private access: MIDIAccess | null = null
  private current: MIDIInput | null = null
  private readonly eventListeners = new Set<(e: NoteEvent) => void>()
  private readonly stateListeners = new Set<(s: MidiAccessState) => void>()
  private accessState: MidiAccessState =
    typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator ? { state: 'pending' } : { state: 'unsupported' }

  async requestAccess(): Promise<void> {
    if (this.accessState.state === 'unsupported') return
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false })
      this.access.onstatechange = () => this.publishDevices()
      this.publishDevices()
    } catch (e) {
      this.setState({ state: 'denied', message: e instanceof Error ? e.message : String(e) })
    }
  }

  select(id: string | null): void {
    if (this.current) this.current.onmidimessage = null
    this.current = id && this.access ? (this.access.inputs.get(id) ?? null) : null
    if (this.current) {
      this.current.onmidimessage = (msg) => {
        if (!msg.data) return
        const ev = parseMidiMessage(msg.data)
        if (ev) for (const l of this.eventListeners) l(ev)
      }
    }
  }

  selectedId(): string | null {
    return this.current?.id ?? null
  }

  onEvent(listener: (e: NoteEvent) => void): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  onState(listener: (s: MidiAccessState) => void): () => void {
    this.stateListeners.add(listener)
    listener(this.accessState)
    return () => this.stateListeners.delete(listener)
  }

  private publishDevices(): void {
    const devices = [...(this.access?.inputs.values() ?? [])]
      .filter((i) => i.state === 'connected')
      .map((i) => ({ id: i.id, name: i.name ?? i.id }))
    this.setState({ state: 'granted', devices })
  }

  private setState(s: MidiAccessState): void {
    this.accessState = s
    for (const l of this.stateListeners) l(s)
  }
}
