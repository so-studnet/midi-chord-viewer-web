# CLAUDE.md

MIDI キーボードの演奏からコードをリアルタイムに表示し、ピアノの音を鳴らす Web アプリ（Java 版 midi-chord-viewer の Web 版）。
ユーザーとは日本語で話す。

- 要件: `docs/requirements.md` / 設計: `docs/architecture.md` / 予定: `docs/roadmap.md`
- チェック一式: `npm run check`（lint・テスト・型チェック・ビルド）
- 開発サーバー: `npm run dev`（Web MIDI は https か localhost でしか動かない）

## 守ること
- 間違えやすいロジック（コード判定・ペダル・サンプル選択）は `src/core/` などの純粋関数に置き、Vitest でテストする
- 発音の経路（MIDI → AudioEngine）に React の state や描画を挟まない
- コード判定を変えたら、意図した差分以外で Java 版との突き合わせテスト（`java-golden.json`）が崩れていないか確かめる。
  判定ルールを意図的に変えるときは、正解データを更新した理由をコミットに書く
- 画面の確認は、`navigator.requestMIDIAccess` を差し替えた疑似 MIDI 機器で Playwright から操作して行う
