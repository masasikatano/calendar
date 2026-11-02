---
name: calendar-update
description: 月次カレンダーのデータファイルを新規作成・修正する
---

# Calendar Update

対象リポジトリの月次市場カレンダーのデータ更新だけを行う。見た目の変更や月切替の実装はしない。

## 対象ファイル

- 月ごとに `docs/events-YYYY-MM.json` を扱う。複数月を1ファイルに同居させない。
- 現存は `docs/events-2026-11.json` のみ。新規月は前月のファイルを複写して作る。
- 対象銘柄リストは月ごとに `docs/universe-YYYY-MM.json` を扱う（現存は `docs/universe-2026-11.json` のみ）。

## 手順

1. 対象月の対象リストを確定する。固定枠は spec.md §4 の10件（ISM製造業、Apple決算、中間選挙、雇用統計、CPI、FOMC議事要旨、OPEX満期、感謝祭休場、ブラックフライデー、早期終了）。2026年11月分はこれに加え、変動枠（マグニフィセント7＋月初時点の GICS 情報技術セクター時価総額上位50社。重複は1件に寄せる）から該当月に決算が見込まれる銘柄を入れる。未確定2件（Anthropic IPO、Cisco決算）は未確定枠に残す。NVIDIA決算は11月17日の電話会議が会社発表済みのため確定枠に移した。
2. 各イベントの日付を一次情報で確認する。経済指標は BLS、ISM、連邦準備制度、決算は各社 IR、選挙は公式日程、休場・早期終了は NYSE 休日カレンダー、満期は OCC 満期カレンダー。一次情報で確認できない決算は、推定日（前年同期の発表日や証券会社の予想日程など）に裏付けがあれば推定日でグリッドに置き、`estimated` を `true` にして根拠を `consensus` と `sourceName` に残す。裏付けがないものはグリッドに入れず、未確定枠に置く。
3. `docs/events-YYYY-MM.json` を雛形に沿って作成または修正する。トップレベルは `asOf`（`YYYY-MM-DD`）、`timezone`（`Asia/Tokyo`）、`month`（`YYYY-MM`）、`unconfirmed`、`events` とする。
4. 確定イベントに `id`、`jstDate`、`jstTime`（終日は `null`）、`usMarketDate`、`etTime`（終日は `null`）、`name`、`category`、`consensus`、`upside`、`downside`、`swing`、`sourceUrl`、`sourceName` を埋める。推定日のイベントは `estimated: true` を付ける。未確定イベントは `id`、`name`、`window`（表示用の期間文言）、`confirmed`（`false`）、`category`、`consensus`、`upside`、`downside`、`swing`、`sourceUrl`、`sourceName` とし、日付項目（`jstDate` など）は持たせない。カテゴリーは `earnings`、`macro`、`politics`、`market`、`ipo` のいずれか。コンセンサス不明は「未発表」と書く（数値を作らない）。
5. 4項目（予想・上振れ・下振れ・持越）は各1〜2文にする。S&P500への影響は過去の典型的な反応として書き、将来の値動きの予測としては書かない。
6. HTML に本文を直書きしない。各イベントに確認できた一次情報の URL を `sourceUrl`、表示名を `sourceName` に残す。日付が確定した未確定イベントは `unconfirmed` から抜いて `events` の該当日（日本時間の日付）へ移す。
7. `docs/universe-YYYY-MM.json` を月初に更新する。Mag7は固定し、`itTop50` を月初時点の GICS 情報技術セクター時価総額上位50社で入れ替える。各銘柄の `months`（平常の決算発表月）は変わらなければ据え置き、`thisMonth` を今月の扱い（`confirmed` / `estimated` / `unconfirmed` / `watch` / `none`）に合わせて付ける。
