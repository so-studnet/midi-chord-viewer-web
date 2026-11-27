# MIDI Chord Viewer (Web)

MIDI キーボード（Roland Fantom-06 など）で弾いた音から、押している鍵盤とコード名をリアルタイムに表示し、アプリ内のピアノ音源でも鳴らす Web アプリです。
[Java 版](https://github.com/so-studnet/midi-chord-viewer)の Web 版です。

- 対応ブラウザ: PC の Chrome（Web MIDI API を使います）
- ピアノ音源: [Salamander Grand Piano V3](https://archive.org/details/SalamanderGrandPianoV3) by Alexander Holm（CC BY 3.0）

## 使い方

1. MIDI キーボードを USB で接続して、Chrome でアプリを開く
2. 「MIDI 機器の使用」を許可する
3. 「♪ 音を出す」を押す（ブラウザの決まりで、最初の 1 回はクリックが必要です）

## 開発

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # lint・テスト・型チェック・ビルド
```

詳しくは [docs/](docs/) を参照してください。
