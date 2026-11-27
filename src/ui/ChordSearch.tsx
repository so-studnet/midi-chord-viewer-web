import { previewChord } from '../app/services'
import { parseChordSymbol } from '../core/theory/chordParser'
import { CHORD_TEMPLATES, type NotationStyle } from '../core/theory/chordTemplates'
import { spellChordTones } from '../core/theory/chordSpelling'
import { chordSymbol, degreeSymbol } from '../core/theory/format'
import { keyName, spellPitchClass, type Key } from '../core/theory/spelling'
import { chordVoicing } from '../core/theory/voicing'
import { KeyboardView } from './KeyboardView'
import { MusicText } from './MusicText'

const EXAMPLES = ['B♭m7', 'CM7', 'F♯ø7', 'G7(♭9)', 'C/E', 'IIm7']

interface Props {
  keyTonic: number | null
  notation: NotationStyle
  query: string
  onQueryChange: (query: string) => void
}

/** コード名（いろいろな記法、度数も可）を入力して、構成音・鍵盤・度数を見る */
export function ChordSearch({ keyTonic, notation, query, onQueryChange: setQuery }: Props) {
  const key: Key | null = keyTonic === null ? null : { tonic: keyTonic }
  // 度数で入力したときのキー。未定なら C として扱う
  const degreeKey: Key = key ?? { tonic: 0 }
  const result = query.trim() ? parseChordSymbol(query, degreeKey) : null
  const chord = result?.ok ? result.chord : null
  // ♯/♭ は今のキーに合わせる。キーが未定なら、入力したルートが ♭ 付き（B♭ など）なら ♭ で書く
  const flatRoot = /^\s*[A-Ga-g](b|♭)/.test(query)
  const spellKey: Key | null = key ?? (chord && flatRoot ? { tonic: chord.root } : null)

  const voicing = chord ? chordVoicing(chord.root, chord.template.mask, chord.bass) : []
  const set = new Set(voicing)

  return (
    <section className="search" aria-label="コード検索">
      <div className="search-row">
        <label className="field search-field">
          コード検索
          <input
            type="search"
            value={query}
            placeholder="例: B♭m7、CM7、F#ø7、IIm7"
            onChange={(e) => setQuery(e.target.value)}
            aria-describedby="search-help"
          />
        </label>
        <span id="search-help" className="muted examples">
          {EXAMPLES.map((ex) => (
            <button key={ex} className="chip" onClick={() => setQuery(ex)}>
              <MusicText text={ex} />
            </button>
          ))}
        </span>
      </div>

      {result && !result.ok && <p className="notice error">{result.error}</p>}

      {chord && (
        <div className="search-result" data-testid="search-result">
          <div className="search-summary">
            <div className="search-name" data-testid="search-name">
              <MusicText text={chordSymbol(chord.root, chord.template, chord.bass, { key: spellKey, notation })} />
            </div>
            <div className="search-degree" data-testid="search-degree">
              <MusicText text={degreeSymbol(chord.root, chord.template, chord.bass, degreeKey, 'unicode', notation)} />
              <span className="muted">（Key: <MusicText text={keyName(degreeKey)} />{key ? '' : '・キー未定のため C で表示'}）</span>
            </div>
            <div className="search-notes" data-testid="search-notes">
              構成音: <MusicText text={spellChordTones(chord.root, chord.template.mask, spellKey).join(' ')} />
              {chord.bass !== chord.root && (
                <span className="muted">
                  （ベース <MusicText text={spellPitchClass(chord.bass, spellKey)} />）
                </span>
              )}
            </div>
            <button className="primary" onClick={() => void previewChord(voicing)}>
              ▶ 鳴らす
            </button>
          </div>
          <div className="keyboard-wrap small">
            <KeyboardView sounding={set} physical={set} keyTonic={spellKey?.tonic ?? null} variant="search" />
          </div>
          <div className="type-list" aria-label="同じルートのコード">
            {CHORD_TEMPLATES.map((t) => (
              <button
                key={t.id}
                className={`chip ${t.id === chord.template.id ? 'active' : ''}`}
                onClick={() =>
                  setQuery(chordSymbol(chord.root, t, chord.root, { key: spellKey, notation, style: 'unicode' }))
                }
              >
                <MusicText text={chordSymbol(chord.root, t, chord.root, { key: spellKey, notation })} />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
