import { pitchClassOf } from '../theory/noteNames'

/**
 * キーの自動判定（純粋関数）。
 *
 * 弾いた音のピッチクラスごとに「どれだけ鳴っていたか」を重みとして貯め、古いものほど小さくする。
 * その重みと Krumhansl–Kessler のキープロファイルとの相関を 24 キーで計算する。
 * 平行長調基準なので、短調（例: Am）の点数は平行長調（C）の点数として扱い、12 個の長調から選ぶ。
 * 表示がちらつかないよう、今のキーをはっきり上回ったときだけ切り替える。
 */

/** Krumhansl & Kessler (1982) の長調・短調プロファイル（主音から半音ずつ） */
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

export const KEY_DETECTION = {
  /** 重みが半分になるまでの秒数（転調への追従の速さ） */
  halfLife: 15,
  /** 弾いた瞬間に足す重み（短い音も数えるため。単位は「秒鳴った」相当） */
  onsetWeight: 0.3,
  /** 最低音（ベース）を弾いたときに追加で足す重み */
  bassOnsetWeight: 0.3,
  /** 1 回の更新で数える経過時間の上限（秒）。更新が止まっていた間を鳴りっぱなしと数えない */
  maxStep: 0.5,
  /** これだけ重みが貯まるまではキーを決めない */
  minTotalWeight: 1.5,
  /** 新しいキーに切り替えるのに必要な相関の差 */
  switchMargin: 0.06,
} as const

export interface KeyDetectorState {
  readonly weights: readonly number[]
  readonly lastTime: number | null
  /** 判定中のキー（長調の主音）。まだ決まっていなければ null */
  readonly tonic: number | null
}

export const INITIAL_KEY_DETECTOR: KeyDetectorState = { weights: new Array(12).fill(0), lastTime: null, tonic: null }

export interface KeyDetectorInput {
  /** 秒 */
  readonly time: number
  /** 今鳴っている音（MIDI ノート番号） */
  readonly sounding: ReadonlySet<number>
  /** この更新までに新しく弾かれた音 */
  readonly onsets?: readonly number[]
}

export function stepKeyDetector(state: KeyDetectorState, input: KeyDetectorInput): KeyDetectorState {
  const c = KEY_DETECTION
  const elapsed = state.lastTime === null ? 0 : Math.max(0, input.time - state.lastTime)
  const decay = Math.pow(0.5, elapsed / c.halfLife)
  const weights = state.weights.map((w) => w * decay)

  const dt = Math.min(elapsed, c.maxStep)
  for (const n of input.sounding) weights[pitchClassOf(n)] += dt

  const onsets = input.onsets ?? []
  if (onsets.length > 0) {
    const lowest = Math.min(...input.sounding, ...onsets)
    for (const n of onsets) {
      weights[pitchClassOf(n)] += c.onsetWeight + (n === lowest ? c.bassOnsetWeight : 0)
    }
  }

  return { weights, lastTime: input.time, tonic: chooseTonic(weights, state.tonic) }
}

function chooseTonic(weights: readonly number[], current: number | null): number | null {
  const total = weights.reduce((a, b) => a + b, 0)
  if (total < KEY_DETECTION.minTotalWeight) return current
  const scores = keyScores(weights)
  let best = 0
  for (let k = 1; k < 12; k++) if (scores[k] > scores[best]) best = k
  if (current === null || current === best) return best
  return scores[best] - scores[current] > KEY_DETECTION.switchMargin ? best : current
}

/** 12 の長調それぞれの点数（その長調と、平行短調のうち高いほう） */
export function keyScores(weights: readonly number[]): number[] {
  const scores: number[] = []
  for (let tonic = 0; tonic < 12; tonic++) {
    const major = correlation(weights, MAJOR_PROFILE, tonic)
    const minor = correlation(weights, MINOR_PROFILE, (tonic + 9) % 12)
    scores.push(Math.max(major, minor))
  }
  return scores
}

function correlation(weights: readonly number[], profile: readonly number[], tonic: number): number {
  const mw = mean(weights)
  const mp = mean(profile)
  let num = 0
  let dw = 0
  let dp = 0
  for (let i = 0; i < 12; i++) {
    const w = weights[(tonic + i) % 12] - mw
    const p = profile[i] - mp
    num += w * p
    dw += w * w
    dp += p * p
  }
  return dw === 0 ? 0 : num / Math.sqrt(dw * dp)
}

function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length
}
