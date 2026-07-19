# ランニングシューズ診断

体格・走り方・ケガ歴・好みの12問で、厳選12モデルからあなたのベスト1足を診断するWebアプリ。

## 構成

- `index.html` 1ファイル完結（ビルド不要・依存なし）
- 診断ロジック：100点満点スコアリング（体格ガード・年齢調整・乗り味マッチ）
- 12モデル：Nike / adidas / ASICS / New Balance / HOKA / On / Mizuno

## 更新方法

`index.html` を直接編集して push すると Vercel（https://runningshoeapps.vercel.app/）に自動反映されます。

- シューズデータ：`const SHOES = [...]`（スペック・実走の感想・弱点）
- 似た機種の対応表：`const SIMILAR_SUGGEST = [...]`
- 質問：`const QUESTIONS = [...]`

## 収益導線

アプリ内に直接アフィリエイトリンクは置かず、各モデルの `ameblo_url` からアメブロのレビュー記事へ送客する（Ameba Pick で収益化）。
