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
