# AGENTS.md

## プロジェクト概要

月次の米国市場スイングカレンダー（静的サイト）。GitHub Pages の `/docs` で公開する想定で、ビルドはない。

- `docs/index.html`: 見出し・グリッド挿入口・免責のみ。本文は直書きしない。
- `docs/app.js`: 月データを `fetch` してレンダリング。見出しの月は月ファイルの `month` から動的生成。
- `docs/months.json`: 公開月の一覧。末尾が既定月。月追加時に追記する。
- `docs/events-YYYY-MM.json`: 月ごとのイベントデータ。
- `docs/universe-YYYY-MM.json`: 対象銘柄リスト（Mag7＋GICS情報技術セクター時価総額上位50社）。
- `spec.md`: 仕様の正本。データ形式・収録ルールはここに従う。
- `README.md`: 使い方と skill による更新手順。

## 作業上のルール

- 画面の文言は日本語。データ（4項目の文章基準など）も日本語。
- HTML に本文を直書きしない。表示内容はすべて月ファイルの JSON を編集して差し替える。
- イベントの追加・確定（未確定枠からの移動）は `.agents/skills/calendar-update/` の手順に従う。一次情報（各社 IR、BLS、NYSE など）で確認した URL を `sourceUrl` に残す。
- コンセンサスが未公開なら「未発表」と書き、数値を作らない。
- 4項目（予想・上振れ・下振れ・持越）は各1〜2文。S&P500への影響は過去の典型的な反応として書き、将来の値動きの予測として書かない。

## 検証方法

```bash
cd docs && python3 -m http.server 8080
```

ブラウザで `http://127.0.0.1:8080/`（既定は `months.json` の末尾の月）と `http://127.0.0.1:8080/?month=YYYY-MM` を確認する。`file://` 直開きは不可。JSON を編集したら構文と `month`・`months.json` の整合性を必ず確認する。

## リリース

リモート操作（push、GitHub Pages 有効化）は利用者の作業。こちらはローカルでコミットまで。
