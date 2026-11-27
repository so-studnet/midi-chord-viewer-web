import { applyEvent, EMPTY_KEYBOARD, releasedNotes, type KeyboardState } from '../core/input/keyboardState'
import type { NoteEvent } from '../core/input/noteEvent'
import type { AudioEngine, EngineStatus } from './audioEngine'
import { chooseLayer, nearestSampledNote, sampleFileName, SAMPLED_NOTES, VELOCITY_LAYERS, type VelocityLayer } from './pianoSamples'

const SAMPLE_BASE = `${import.meta.env.BASE_URL}samples/piano/`
/** 先に読む（これだけで音は出せる）レイヤー */
const FIRST_LAYER: VelocityLayer = 8
/** 鍵盤を離してから音が消えるまでの時定数（秒） */
const RELEASE_TIME_CONSTANT = 0.12
/** 同じ音を弾き直したとき、前の音を消す時定数 */
const RETRIGGER_TIME_CONSTANT = 0.03
/** 同時発音数の上限（超えたら古い音から止める） */
const MAX_VOICES = 64
/** これより小さい振幅はサンプル冒頭の無音とみなして飛ばす */
const SILENCE_THRESHOLD = 0.0015

interface Sample {
  buffer: AudioBuffer
  /** 冒頭の無音を飛ばす位置（秒） */
  offset: number
}

interface Voice {
  note: number
  source: AudioBufferSourceNode
  gain: GainNode
}

/** Salamander Grand Piano のサンプルを Web Audio で鳴らすピアノ音源 */
export class PianoSampler implements AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private readonly samples = new Map<string, Sample>()
  private readonly loadedLayers: VelocityLayer[] = []
  private voices: Voice[] = []
  private keyboard: KeyboardState = EMPTY_KEYBOARD
  private volume = 0.8
  private enabled = true
  private status: EngineStatus = { state: 'idle' }
  private readonly listeners = new Set<(s: EngineStatus) => void>()
  private starting: Promise<void> | null = null

  start(): Promise<void> {
    this.starting ??= this.doStart().catch((e: unknown) => {
      this.setStatus({ state: 'error', message: e instanceof Error ? e.message : String(e) })
      this.starting = null
    })
    return this.starting
  }

  private async doStart(): Promise<void> {
    // interactive = できるだけ小さいバッファで動かす（遅延優先）
    const ctx = new AudioContext({ latencyHint: 'interactive' })
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = this.enabled ? this.volume : 0
    this.master.connect(ctx.destination)
    await ctx.resume()

    const total = SAMPLED_NOTES.length * VELOCITY_LAYERS.length
    let loaded = 0
    this.setStatus({ state: 'loading', loaded, total })
    const loadLayer = async (layer: VelocityLayer) => {
      await Promise.all(
        SAMPLED_NOTES.map(async (note) => {
          this.samples.set(key(note, layer), await this.fetchSample(ctx, sampleFileName(note, layer)))
          loaded++
          if (this.status.state === 'loading') this.setStatus({ state: 'loading', loaded, total })
        }),
      )
      this.loadedLayers.push(layer)
    }
    // まず中くらいの強さを全部読み、すぐ弾けるようにしてから残りを読む
    await loadLayer(FIRST_LAYER)
    this.setStatus({ state: 'ready' })
    for (const layer of VELOCITY_LAYERS) if (layer !== FIRST_LAYER) await loadLayer(layer)
  }

  private async fetchSample(ctx: AudioContext, file: string): Promise<Sample> {
    const res = await fetch(SAMPLE_BASE + file)
    if (!res.ok) throw new Error(`サンプルを読み込めません: ${file} (${res.status})`)
    const buffer = await ctx.decodeAudioData(await res.arrayBuffer())
    return { buffer, offset: leadingSilence(buffer) }
  }

  handle(event: NoteEvent): void {
    const prev = this.keyboard
    this.keyboard = applyEvent(prev, event)
    if (!this.ctx || !this.master) return
    for (const note of releasedNotes(prev, this.keyboard)) this.release(note, RELEASE_TIME_CONSTANT)
    if (event.type === 'noteOn') this.play(event.note, event.velocity)
  }

  private play(note: number, velocity: number): void {
    const ctx = this.ctx!
    const choice = chooseLayer(velocity, this.loadedLayers)
    if (!choice) return
    const base = nearestSampledNote(note)
    const sample = this.samples.get(key(base, choice.layer))
    if (!sample) return

    this.release(note, RETRIGGER_TIME_CONSTANT)
    if (this.voices.length >= MAX_VOICES) this.stopVoice(this.voices.shift()!, RETRIGGER_TIME_CONSTANT)

    const source = ctx.createBufferSource()
    source.buffer = sample.buffer
    source.playbackRate.value = Math.pow(2, (note - base) / 12)
    const gain = ctx.createGain()
    gain.gain.value = choice.gain
    source.connect(gain).connect(this.master!)
    // 予約せず「今すぐ」鳴らす。これが一番遅延が小さい
    source.start(0, sample.offset)
    const voice: Voice = { note, source, gain }
    source.onended = () => {
      this.voices = this.voices.filter((v) => v !== voice)
      gain.disconnect()
    }
    this.voices.push(voice)
  }

  private release(note: number, timeConstant: number): void {
    for (const v of this.voices) if (v.note === note) this.stopVoice(v, timeConstant)
    this.voices = this.voices.filter((v) => v.note !== note)
  }

  private stopVoice(v: Voice, timeConstant: number): void {
    const t = this.ctx!.currentTime
    v.gain.gain.cancelScheduledValues(t)
    v.gain.gain.setValueAtTime(v.gain.gain.value, t)
    v.gain.gain.setTargetAtTime(0, t, timeConstant)
    v.source.stop(t + timeConstant * 8)
  }

  setVolume(volume: number): void {
    this.volume = volume
    this.applyMaster()
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.applyMaster()
  }

  private applyMaster(): void {
    if (!this.ctx || !this.master) return
    this.master.gain.setTargetAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime, 0.01)
  }

  latency(): { base: number; output: number } | null {
    if (!this.ctx) return null
    return { base: this.ctx.baseLatency ?? 0, output: this.ctx.outputLatency ?? 0 }
  }

  onStatus(listener: (s: EngineStatus) => void): () => void {
    this.listeners.add(listener)
    listener(this.status)
    return () => this.listeners.delete(listener)
  }

  private setStatus(s: EngineStatus): void {
    this.status = s
    for (const l of this.listeners) l(s)
  }
}

function key(note: number, layer: VelocityLayer): string {
  return `${note}:${layer}`
}

function leadingSilence(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0)
  const limit = Math.min(data.length, Math.floor(buffer.sampleRate * 0.05))
  for (let i = 0; i < limit; i++) {
    if (Math.abs(data[i]) > SILENCE_THRESHOLD) return Math.max(0, i - buffer.sampleRate * 0.0005) / buffer.sampleRate
  }
  return 0
}
