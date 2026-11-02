# architecture.md

## 全体構成

静的サイトで、ビルドなし。ブラウザが `docs/` 内の JSON を相対パスで `fetch` してレンダリングする。

```
docs/
├── index.html          # 見出し・グリッド挿入口(#app)・免責のみ
├── styles.css          # ダーク配色・グリッド・モーダル・凡例
├── app.js              # データ読込 + レンダリング（依存なしの IIFE）
├── months.json         # 公開月の一覧。末尾 = 既定月
├── events-YYYY-MM.json # 月ごとのイベント（確定 events + 未確定 unconfirmed）
└── universe-YYYY-MM.json # 対象銘柄リスト
```

## データの流れ

1. `app.js` が `months.json` を読む。
2. `?month=YYYY-MM` が `months.json` に載っていればその月、未指定・形式不正・未収録なら末尾（最新月）を選ぶ。
3. 選んだ月の `events-YYYY-MM.json` を読み、月グリッド（月曜始まり・7列×42マス）・未確定カード・凡例・略語の解説を生成する。
4. `<title>`・`<h1>` は月ファイルの `month` から動的生成。
5. `universe-YYYY-MM.json` は別途非同期に読み、読めた月だけ「対象銘柄と決算月」を表示する（読めない月は表示自体を出さない）。

## イベントの表示ルール（app.js 側の固定仕様）

- チップ表示名はイベントの `shortName`（無い場合は `name`）。
- `estimated: true` のイベントはチップ名に「推定」プレフィックス、詳細モーダルに注記。
- マス内の並びは優先度順（政治 > 経済指標 > 決算 > 市場 > IPO）、チップは最大6件、超過分は「+N件」。
- `category: market` かつ `jstTime: null` の日は休場スタイル。
- 日マスは `button`、詳細はモーダル（× / 背景クリック / Esc で閉じる）。

## 月データのスキーマ

`events-YYYY-MM.json`:

- トップレベル: `asOf`、`timezone`（`Asia/Tokyo`）、`month`（`YYYY-MM`）、`unconfirmed`、`events`。
- `events` 要素: `id`（ファイル内一意）、`jstDate`、`jstTime`（終日は `null`）、`usMarketDate`、`etTime`、`name`、`shortName`（任意）、`category`（`earnings`/`macro`/`politics`/`market`/`ipo`）、`consensus`、`upside`、`downside`、`swing`、`sourceUrl`、`sourceName`、任意で `estimated: true`。
- `unconfirmed` 要素: 日付項目を持たず `window`（期間文言）を持つ。

`universe-YYYY-MM.json`: トップレベル `asOf`/`month`/`note` と `mag7`、`itTop50`（各要素は `ticker`/`name`/`months`/`thisMonth`。`thisMonth` は `confirmed`/`estimated`/`unconfirmed`/`watch`/`none`）。

## 月追加の手順（概要）

詳細は `.agents/skills/calendar-update/SKILL.md`。

1. 前月の `events-YYYY-MM.json` を複写して雛形を作る。
2. spec.md §4 の4枠（定期枠・不定期枠・変動枠・未確定枠）に従い一次情報で日付を確認して入れる。
3. `months.json` の末尾に `{ "month": "YYYY-MM", "file": "events-YYYY-MM.json" }` を追記（既定月になる）。
4. `universe-YYYY-MM.json` を月初時点の IT 上位50社で更新。

## Kimi Code CLI との連携

- プロジェクト指示: この `AGENTS.md`（ルート）。
- プロジェクト skill: `.agents/skills/`（Kimi Code のネイティブなスキャン場所）。
- プロジェクト MCP: `.kimi-code/mcp.json`（現在未設定）。
