import { CHORD_TEMPLATES, type ChordTemplate } from './chordTemplates'
import { pitchClassOf } from './noteNames'
import type { Key } from './spelling'

/** コード名を読み取った結果 */
export interface ParsedChord {
  readonly root: number
  readonly template: ChordTemplate
  readonly bass: number
  /** 度数（IIm7 など）で入力されたか */
  readonly fromDegree: boolean
}

export type ParseResult = { readonly ok: true; readonly chord: ParsedChord } | { readonly ok: false; readonly error: string }

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const ROMAN_PC: Record<string, number> = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 }

const NOTE_RE = /^([A-G])([#b]*)/
const ROMAN_RE = /^([#b]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(?![a-zIV])/
const ROMAN_RE_LOOSE = /^([#b]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)/

/**
 * コード名（いろいろな記法）を読み取る。
 * 例: "Bbm7" "B♭m7" "CM7" "C△7" "Cmaj7" "Cm7-5" "Cø" "C-7" "G7(b9)" "G7b9" "C/E" "C69"
 * 度数でも書ける: "IIm7" "♭VII" "V7/VII" "ii7"（小文字はマイナー）。度数は key を主音にする。
 */
export function parseChordSymbol(input: string, key: Key): ParseResult {
  // 小文字の音名（bbm7 など）は大文字にする。ただし ♭VII の「b」（bVII / bvii）はそのまま
  const text = normalize(input).replace(/^[a-g](?![ivIV])/, (c) => c.toUpperCase())
  if (text === '') return { ok: false, error: 'コード名を入力してください' }

  const head = readRoot(text)
  if (!head) return { ok: false, error: 'ルート音（C〜B または I〜VII）が読み取れません' }

  let rest = text.slice(head.length)
  let bass: number | null = null
  const slash = rest.match(/\/([A-G][#b]*|[#b]?(?:VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i))$/)
  if (slash) {
    const b = readRoot(slash[1])
    if (b && b.length === slash[1].length) {
      bass = b.degree ? pitchClassOf(key.tonic + b.pc) : b.pc
      rest = rest.slice(0, slash.index)
    }
  }

  let suffix = canonicalSuffix(rest)
  // 小文字の度数（ii7 など）はマイナー
  if (head.degree && head.lowercase && !/^(m|dim|aug)/.test(suffix)) suffix = 'm' + suffix
  const template = TEMPLATE_BY_CANON.get(suffix)
  if (!template) return { ok: false, error: `「${rest}」というコードの種類が分かりません` }

  const root = head.degree ? pitchClassOf(key.tonic + head.pc) : head.pc
  return { ok: true, chord: { root, template, bass: bass ?? root, fromDegree: head.degree } }
}

interface Root {
  pc: number
  length: number
  degree: boolean
  lowercase: boolean
}

function readRoot(text: string): Root | null {
  const n = text.match(NOTE_RE)
  if (n) {
    let pc = LETTER_PC[n[1]]
    for (const a of n[2]) pc += a === '#' ? 1 : -1
    return { pc: pitchClassOf(pc), length: n[0].length, degree: false, lowercase: false }
  }
  // 度数の直後に英小文字が続くと「dim」「add」と区別しにくいので、まず厳しく、だめなら緩く読む
  const r = text.match(ROMAN_RE) ?? text.match(ROMAN_RE_LOOSE)
  if (r) {
    const acc = r[1] === '#' ? 1 : r[1] === 'b' ? -1 : 0
    return {
      pc: pitchClassOf(ROMAN_PC[r[2].toUpperCase()] + acc),
      length: r[0].length,
      degree: true,
      lowercase: r[2] === r[2].toLowerCase(),
    }
  }
  return null
}

function normalize(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#')
    .replace(/[Δ∆]/g, '△')
    .replace(/[−–—ー]/g, '-')
    .replace(/[º˚]/g, '°')
    .replace(/Ø/g, 'ø')
}

/**
 * コードの種類の書き方をそろえる。記法の違い（M7 / maj7 / △7、m7-5 / m7(b5) / ø 、7b9 / 7(b9) / 7-9 など）
 * を同じ文字列にする。CHORD_TEMPLATES の各記法の名前にも同じ変換をかけて突き合わせる。
 */
export function canonicalSuffix(raw: string): string {
  let s = normalize(raw)
  // 日本式の「C(9)」「Cm(9)」は add9
  s = s.replace(/^(m?)\((9|11)\)$/, '$1add$2')
  s = s.replace(/[(),/]/g, '')
  // 先頭の記号
  s = s.replace(/^ø7?/, 'm7b5')
  s = s.replace(/^(min|mi|-)/, 'm')
  s = s.replace(/^m(°|o)/, 'dim')
  s = s.replace(/^(\+|aug)/, 'aug')
  s = s.replace(/^(°|o|dim)/, 'dim')
  // メジャーセブンス系
  s = s.replace(/△(?!\d)/g, 'maj7')
  s = s.replace(/(maj|Maj|MAJ|ma|M|△|j)(?=\d)/g, 'maj')
  s = s.replace(/(maj|Maj|MAJ|M)$/, '')
  // 7-9 → 7b9、7+5 → 7#5
  s = s.replace(/(\d)-(\d)/g, '$1b$2').replace(/(\d)\+(\d)/g, '$1#$2')
  s = s.replace(/sus$/, 'sus4')
  return ALIASES[s] ?? s
}

/** 記法の名前からは作れない別名（canonicalSuffix の結果 → 種類の ID の正規形） */
const ALIASES: Record<string, string> = {
  '79': '9',
  '7913': '13',
  maj79: 'maj9',
  m79: 'm9',
  m7911: 'm11',
  '7#5': 'aug7',
  aug7: 'aug7',
  '#5': 'aug',
  '79#11': '9#11',
  '7b5': '7b5',
  m7b5: 'm7b5',
  mmaj: 'mmaj7',
  dim7b5: 'dim7',
  m7b59: 'm7b59',
  add2: 'add9',
  '2': 'sus2',
  '4': 'sus4',
}

const TEMPLATE_BY_CANON: ReadonlyMap<string, ChordTemplate> = (() => {
  const map = new Map<string, ChordTemplate>()
  for (const t of CHORD_TEMPLATES) {
    for (const name of Object.values(t.names)) {
      const c = canonicalSuffix(name)
      if (!map.has(c)) map.set(c, t)
    }
  }
  return map
})()
