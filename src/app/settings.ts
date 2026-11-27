import type { KeyMode } from './keyStore'

/** 端末ごとの設定（ブラウザ内に保存。読めなくても動くようにする） */
export interface Settings {
  deviceName: string | null
  soundEnabled: boolean
  volume: number
  keyMode: KeyMode
}

const KEY = 'midi-chord-viewer:settings:v1'
const DEFAULTS: Settings = { deviceName: null, soundEnabled: true, volume: 0.8, keyMode: { mode: 'auto' } }

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    const v = JSON.parse(raw) as Partial<Settings>
    return {
      deviceName: typeof v.deviceName === 'string' ? v.deviceName : DEFAULTS.deviceName,
      soundEnabled: typeof v.soundEnabled === 'boolean' ? v.soundEnabled : DEFAULTS.soundEnabled,
      volume: typeof v.volume === 'number' && v.volume >= 0 && v.volume <= 1 ? v.volume : DEFAULTS.volume,
      keyMode: parseKeyMode(v.keyMode),
    }
  } catch {
    return DEFAULTS
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // 保存できなくても動作には影響しない
  }
}

function parseKeyMode(v: unknown): KeyMode {
  if (typeof v === 'object' && v !== null && 'mode' in v && v.mode === 'manual' && 'tonic' in v) {
    const tonic = v.tonic
    if (typeof tonic === 'number' && Number.isInteger(tonic) && tonic >= 0 && tonic < 12) return { mode: 'manual', tonic }
  }
  return { mode: 'auto' }
}
