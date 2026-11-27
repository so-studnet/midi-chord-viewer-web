import { useEffect, useState, useSyncExternalStore } from 'react'
import { audioEngine, keyboardStore, keyStore, midiInput } from './app/services'
import { loadSettings, saveSettings, type Settings } from './app/settings'
import type { EngineStatus } from './audio/audioEngine'
import type { MidiAccessState } from './midi/midiInput'
import { NOTATION_STYLES } from './core/theory/chordTemplates'
import { ChordDisplay } from './ui/ChordDisplay'
import { ChordSearch } from './ui/ChordSearch'
import { KeyboardView } from './ui/KeyboardView'
import { KeySelector } from './ui/KeySelector'

export default function App() {
  const keyboard = useSyncExternalStore(keyboardStore.subscribe, keyboardStore.getSnapshot)
  const key = useSyncExternalStore(keyStore.subscribe, keyStore.getSnapshot)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [midi, setMidi] = useState<MidiAccessState>({ state: 'pending' })
  const [engine, setEngine] = useState<EngineStatus>({ state: 'idle' })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => midiInput.onState(setMidi), [])
  useEffect(() => audioEngine.onStatus(setEngine), [])
  useEffect(() => {
    void midiInput.requestAccess()
  }, [])

  // 前回選んだ機器（なければ最初の機器）を自動で選ぶ。抜かれたら選択を外す
  useEffect(() => {
    if (midi.state !== 'granted') return
    const current = midi.devices.find((d) => d.id === selectedId)
    if (current) return
    const next = midi.devices.find((d) => d.name === settings.deviceName) ?? midi.devices[0] ?? null
    midiInput.select(next?.id ?? null)
    setSelectedId(next?.id ?? null)
  }, [midi, selectedId, settings.deviceName])

  useEffect(() => {
    saveSettings(settings)
    audioEngine.setVolume(settings.volume)
    audioEngine.setEnabled(settings.soundEnabled)
    keyStore.setMode(settings.keyMode)
  }, [settings])

  const chooseDevice = (id: string) => {
    midiInput.select(id || null)
    setSelectedId(id || null)
    const name = midi.state === 'granted' ? (midi.devices.find((d) => d.id === id)?.name ?? null) : null
    setSettings((s) => ({ ...s, deviceName: name }))
  }

  return (
    <div className="app">
      <header className="toolbar">
        <h1>MIDI Chord Viewer</h1>
        <DeviceSelect midi={midi} selectedId={selectedId} onChange={chooseDevice} />
        <label className="field">
          記法
          <select
            value={settings.notation}
            onChange={(e) => setSettings((s) => ({ ...s, notation: e.target.value as Settings['notation'] }))}
          >
            {NOTATION_STYLES.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}（{n.example}）
              </option>
            ))}
          </select>
        </label>
        <SoundControls engine={engine} settings={settings} onChange={setSettings} />
      </header>

      <main>
        <KeySelector snapshot={key} onChange={(keyMode) => setSettings((s) => ({ ...s, keyMode }))} />
        <ChordDisplay sounding={keyboard.sounding} keyTonic={key.effective?.tonic ?? null} notation={settings.notation} />
        <div className="keyboard-wrap">
          <KeyboardView sounding={keyboard.sounding} physical={keyboard.physical} keyTonic={key.effective?.tonic ?? null} />
        </div>
        <div className="pedal" data-on={keyboard.sustainDown}>
          サステイン {keyboard.sustainDown ? 'ON' : 'OFF'}
        </div>
        <ChordSearch keyTonic={key.effective?.tonic ?? null} notation={settings.notation} />
      </main>

      <footer>
        Piano: Salamander Grand Piano V3 by Alexander Holm (
        <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">
          CC BY 3.0
        </a>
        )
      </footer>
    </div>
  )
}

function DeviceSelect(props: { midi: MidiAccessState; selectedId: string | null; onChange: (id: string) => void }) {
  const { midi } = props
  if (midi.state === 'unsupported')
    return <p className="notice error">このブラウザは Web MIDI に対応していません。Chrome で開いてください。</p>
  if (midi.state === 'pending') return <p className="notice">MIDI の使用を許可してください…</p>
  if (midi.state === 'denied')
    return <p className="notice error">MIDI の使用が許可されませんでした。アドレスバー左のアイコンから許可してください。</p>
  if (midi.devices.length === 0) return <p className="notice">MIDI 機器が見つかりません。USB を接続してください。</p>
  return (
    <label className="field">
      入力
      <select value={props.selectedId ?? ''} onChange={(e) => props.onChange(e.target.value)}>
        {midi.devices.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function SoundControls(props: { engine: EngineStatus; settings: Settings; onChange: (f: (s: Settings) => Settings) => void }) {
  const { engine, settings } = props
  if (engine.state === 'idle')
    return (
      <button className="primary" onClick={() => void audioEngine.start()}>
        ♪ 音を出す
      </button>
    )
  if (engine.state === 'error') return <p className="notice error">音源エラー: {engine.message}</p>
  const latency = audioEngine.latency()
  return (
    <div className="sound">
      <label className="field">
        <input
          type="checkbox"
          checked={settings.soundEnabled}
          onChange={(e) => props.onChange((s) => ({ ...s, soundEnabled: e.target.checked }))}
        />
        音
      </label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={settings.volume}
        aria-label="音量"
        onChange={(e) => props.onChange((s) => ({ ...s, volume: Number(e.target.value) }))}
      />
      {engine.state === 'loading' && (
        <span className="muted">
          読み込み中 {engine.loaded}/{engine.total}
        </span>
      )}
      {latency && (
        <span className="muted" title="ブラウザが報告する出力の遅延（MIDI 受信〜スピーカーの一部）">
          出力遅延 {Math.round((latency.base + latency.output) * 1000)}ms
        </span>
      )}
    </div>
  )
}
