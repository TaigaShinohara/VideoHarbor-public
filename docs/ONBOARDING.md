# 初回ガイド（オンボーディング）— 設計と検証の記録

実装：`extension/onboarding.js`、`extension/workspace.css`、`extension/workspace.js`、画面本体は `extension/workspace.html` 内の `#onboarding`。
最新の設計・ページ地図（全13ページ）と検証記録の正本は以下を参照してください。

- 設計・ページ地図・4つの達成条件：[DESIGN.md](DESIGN.md)
- パーツ定義・役割：[UI_CATALOG.md](UI_CATALOG.md)
- 自動検証・未確認境界：[QA.md](QA.md)

## 起動と再表示

- 初回起動時（`ONBOARDING_VERSION = 1` 未完了時）に自動表示します（自動テスト環境 `navigator.webdriver` では抑制）。
- 完了・スキップ後も、ヘッダーの「はじめてガイド」またはヘルプ内の「使い方ガイドを見る」からいつでも再表示できます。
- 選択した困りごと・試し操作の結果は端末内の `chrome.storage.local`（非対応環境は `localStorage`）にのみ保存し、外部送信・個人識別子の計測は一切行いません。
