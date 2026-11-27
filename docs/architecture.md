# 設計

Vite + React + TypeScript の静的サイト（サーバー処理なし）。Vercel で公開する。

## データの流れ

```
Web MIDI (MIDIInput.onmidimessage)
   │  parseMidiMessage() → NoteEvent
   ├──▶ AudioEngine.handle()      … すぐ発音（React を通らない）
   └──▶ KeyboardStore.dispatch()  … 状態を更新し、1 フレームに 1 回画面へ通知
                                     └─ useSyncExternalStore → 鍵盤・コード表示
```

すべての入力は `NoteEvent`（noteOn / noteOff / sustain）にそろえる。
将来の MIDI ファイル再生・画面上の鍵盤・録音・練習モードは、このイベントを作る／記録する／照合するものとして足す。

## フォルダ

| 場所 | 役割 |
|---|---|
| `src/core/theory/` | 音名・音程・コードのテンプレートと判定（純粋関数。Java 版の移植） |
| `src/core/input/` | `NoteEvent` と MIDI バイト列の変換、鍵盤状態（ペダル込み）の更新（純粋関数） |
| `src/midi/` | Web MIDI の受け取り口 |
| `src/audio/` | `AudioEngine` インターフェースと、その実装 `PianoSampler` |
| `src/app/` | 配線（`services.ts`）、画面用ストア、設定の保存 |
| `src/ui/` | React の画面部品 |
| `tools/java-golden/` | Java 版の判定結果を正解データとして書き出すスクリプト |
| `scripts/copy-samples.mjs` | npm パッケージのピアノのサンプルを `public/samples/piano/` へコピー（dev / build 前に自動実行） |

## 音源（PianoSampler）

- Salamander Grand Piano V3（CC BY 3.0）の OGG。npm の `@audio-samples/piano-velocity{4,8,12,16}`
- サンプルは A0〜C8 の短 3 度おき 30 音 × 強さ 4 段階（約 20MB）。間の音は再生速度を変えて作る
- 中くらいの強さ（v8）を先に読み、読み終えたら弾ける。残りは裏で読む
- サンプル冒頭の無音（数 ms）は読み込み時に検出して飛ばす
- 鍵盤状態は `core/input/keyboardState.ts` を音源の中でも使い、「鳴っている音から外れた音」を止める（ペダルの扱いが画面と一致する）
- 音源を替えるとき（SoundFont シンセ等）は `AudioEngine` を実装した別クラスを作り、`services.ts` の 1 行を替える
