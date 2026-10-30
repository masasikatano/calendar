---
name: calendar-update
description: 月次カレンダーのデータファイルを新規作成・修正する
---

# Calendar Update

対象リポジトリの月次市場カレンダーのデータ更新だけを行う。見た目の変更や月切替の実装はしない。

## 対象ファイル

- 月ごとに `docs/events-YYYY-MM.json` を扱う。複数月を1ファイルに同居させない。
- 既存の `docs/events.json` は2026年11月分として扱う。

## 手順

1. 対象月の対象リストを確定する。固定枠は Amazon と Tesla。変動枠は NASDAQ 上場かつ GICS 情報技術セクターの時価総額上位50社を月初時点で固定する。重複時は固定枠に寄せて1件にする。
2. 各イベントの日付を一次情報で確認する。経済指標は BLS、ISM、連邦準備制度、日本は内閣府と総務省統計局、決算は各社 IR、選挙は公式日程。日付を確認できないものはグリッドに入れない。Anthropic IPO は未確定枠のみ。
3. `docs/events-YYYY-MM.json` を雛形に沿って作成または修正する。トップレベルは `asOf`、`timezone`、`month`、`unconfirmed`、`events` とする。
4. 各イベントに `id`、`jstDate`、`jstTime`、`usMarketDate`、`etTime`、`name`、`category`、`consensus`、`upside`、`downside`、`swing`、`sourceUrl`、`sourceName` を埋める。コンセンサス不明は「未発表」と書く。
5. 4項目は各1〜2文にする。将来の値動きの予測としては書かない。
6. HTML に本文を直書きしない。出典 URL を各イベントに残す。
