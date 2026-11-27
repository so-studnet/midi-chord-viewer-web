// Salamander Grand Piano の OGG サンプル（npm パッケージ）を public/samples/piano/ にコピーする。
// ファイル名の "#" は URL で扱いにくいので "s" に置き換える（例: D#4v8.ogg → Ds4v8.ogg）。
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dest = join(root, 'public', 'samples', 'piano')
const layers = [4, 8, 12, 16]

mkdirSync(dest, { recursive: true })
let copied = 0
for (const v of layers) {
  const src = join(root, 'node_modules', '@audio-samples', `piano-velocity${v}`, 'audio')
  for (const file of readdirSync(src)) {
    const to = join(dest, file.replace('#', 's'))
    if (!existsSync(to)) {
      cpSync(join(src, file), to)
      copied++
    }
  }
}
console.log(`piano samples: ${copied} copied -> public/samples/piano`)
