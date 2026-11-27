import { keyName } from '../core/theory/spelling'
import type { KeyMode, KeySnapshot } from '../app/keyStore'
import { MusicText } from './MusicText'

const TONICS = Array.from({ length: 12 }, (_, i) => i)

interface Props {
  snapshot: KeySnapshot
  onChange: (mode: KeyMode) => void
}

/** キーの表示と選択。「自動」か、12 の長調（平行短調を併記）から選ぶ */
export function KeySelector({ snapshot, onChange }: Props) {
  const { mode, detected, effective } = snapshot
  const current = effective ? keyName(effective) : '判定中…'
  return (
    <div className="key-bar">
      <span className="key-current" data-testid="key-current">
        Key: <strong>
          <MusicText text={current} />
        </strong>
        <span className="muted">{mode.mode === 'auto' ? '（自動）' : '（手動）'}</span>
      </span>
      <label className="field">
        <span className="visually-hidden">キーの指定</span>
        <select
          aria-label="キーの指定"
          value={mode.mode === 'auto' ? 'auto' : String(mode.tonic)}
          onChange={(e) =>
            onChange(e.target.value === 'auto' ? { mode: 'auto' } : { mode: 'manual', tonic: Number(e.target.value) })
          }
        >
          <option value="auto">自動で判定</option>
          {TONICS.map((t) => (
            <option key={t} value={t}>
              {keyName({ tonic: t })}
            </option>
          ))}
        </select>
      </label>
      {mode.mode === 'auto' && detected && (
        <button onClick={() => onChange({ mode: 'manual', tonic: detected.tonic })}>このキーで固定</button>
      )}
    </div>
  )
}
