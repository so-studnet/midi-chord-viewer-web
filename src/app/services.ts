import { PianoSampler } from '../audio/pianoSampler'
import type { AudioEngine } from '../audio/audioEngine'
import { MidiInput } from '../midi/midiInput'
import { KeyboardStore } from './keyboardStore'
import { KeyStore } from './keyStore'
import { loadSettings } from './settings'

/**
 * アプリ全体で 1 つずつ持つもの。配線はここだけで行う。
 * MIDI → 音源 は直接つなぐ（React を通さないので描画の重さが音の遅れにならない）。
 */
export const midiInput = new MidiInput()
export const audioEngine: AudioEngine = new PianoSampler()
export const keyboardStore = new KeyboardStore()
export const keyStore = new KeyStore(loadSettings().keyMode)

midiInput.onEvent((e) => audioEngine.handle(e))
midiInput.onEvent(keyboardStore.dispatch)
midiInput.onEvent(keyStore.dispatch)

/** 音源を使える状態にする（最初の強さのサンプルを読み終えるまで待つ）。クリックなどの操作の中で呼ぶ */
export function ensureAudioReady(): Promise<void> {
  void audioEngine.start()
  return new Promise((resolve, reject) => {
    const off = audioEngine.onStatus((s) => {
      if (s.state === 'ready') {
        queueMicrotask(() => off())
        resolve()
      } else if (s.state === 'error') {
        queueMicrotask(() => off())
        reject(new Error(s.message))
      }
    })
  })
}

/**
 * 検索したコードを試しに鳴らす。音源だけに送り、画面の鍵盤やキー判定には流さない。
 * 少しずつずらして鳴らす（アルペジオ気味）と構成音が聞き取りやすい。
 */
export async function previewChord(notes: readonly number[], { strumMs = 25, lengthMs = 1600 } = {}): Promise<void> {
  await ensureAudioReady()
  notes.forEach((note, i) => {
    setTimeout(() => audioEngine.handle({ type: 'noteOn', note, velocity: 80 }), i * strumMs)
  })
  setTimeout(() => {
    for (const note of notes) audioEngine.handle({ type: 'noteOff', note })
  }, lengthMs)
}
