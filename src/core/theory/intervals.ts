const NAMES = [
  '完全1度', '短2度', '長2度', '短3度', '長3度', '完全4度',
  '増4度/減5度', '完全5度', '短6度', '長6度', '短7度', '長7度',
] as const

/** 半音数 → 音程名（オクターブを超える分は折り返す） */
export function intervalName(semitones: number): string {
  return NAMES[((semitones % 12) + 12) % 12]
}
