# AGENT_GUIDE — VideoHarbor

AI エージェント向けの使い方メモ。このファイルが、VideoHarbor を機械から使うときの正本である。

## アプリの目的（1行）

見ているページの動画を、利用者の操作で保存するか録画する Chrome 拡張。YouTube 系サイトでは検出・保存・録画（画面／ウィンドウ録画を除く）をしない。

## 到達レベル

- レベル: L2（範囲付き）
- 読み取り: 可（status / list / get / history / doctor）
- 操作: 計画のみ可（plan-save。保存・録画の実行は人間専用 — 理由は「人間専用操作」に記載）
- 検証: 可（verify、plan-save のドライラン、決定的モード `--now`）

## 最初に読むもの

- 機械可読な目録: `docs/agent-manifest.json`
- 操作カタログと監査: `docs/AGENT_OPERATIONS.md`
- スキーマ版数: 1
- 起動方法: `node scripts/agent-cli.mjs <command>`（または `npm run agent -- <command>`）

## コマンド一覧

| コマンド | 種別 | 説明 | 例 |
|---|---|---|---|
| `status --json` | 読み取り | 版数、権限名、状態の置き場、履歴件数 | `node scripts/agent-cli.mjs status` |
| `doctor --json` | 読み取り | 前提条件のチェックと直し方 | `node scripts/agent-cli.mjs doctor` |
| `list --json` | 読み取り | 操作とコマンドの一覧（目録が正本） | `node scripts/agent-cli.mjs list` |
| `get <id> --json` | 読み取り | 操作名・コマンド名・履歴 request_id の詳細 | `node scripts/agent-cli.mjs get plan-save` |
| `history --json` | 読み取り | CLI の実行履歴と失敗理由 | `node scripts/agent-cli.mjs history --limit 20` |
| `plan-save --url <url> --json` | 計画（ドライラン） | 保存の事前判定: 対応可否、形式の選択肢、出力ファイル名 | 下記フロー参照 |
| `verify --json` | 読み取り | リポジトリ検証＋文書と CLI の一致＋計画のスモークテスト | `node scripts/agent-cli.mjs verify` |

全コマンド共通フラグ: `--json`（既定）/ `--human` / `--dry-run`（履歴に記録しない）/ `--yes`（受理するが破壊的コマンドが無いため未使用）/ `--idempotency-key <key>`（plan-save で同キーの再実行は最初の結果を返す）/ `--timeout <sec>`（verify のチェック実行用）/ `--help`（コマンドごと）。

## 入出力スキーマ

- 成功: `{"ok": true, "data": ..., "meta": {"schema_version": 1, "request_id": "..."}}`
- 失敗: `{"ok": false, "error": {"code": "...", "message": "...", "retryable": false, "details": {...}}, "meta": {...}}`
- 終了コード: 0 成功 / 1 入力誤り / 2 アプリ側失敗 / 3 ポリシー拒否 / 4 対象なし
- 日時は ISO 8601（UTC）。ID は UUID。秘密情報は出力しない（権限は名前のみ、状態は有無のみ）。

### エラーコード表

| code | 終了コード | 意味 |
|---|---|---|
| `invalid_input` | 1 | 引数・フラグの誤り |
| `format_not_allowed` | 1 | その候補では選べない保存形式（理由は message に入る） |
| `site_not_supported` | 3 | YouTube 系サイトなど、対応しないサイト |
| `url_not_allowed` | 3 | http(s) 以外など、計画できない URL |
| `not_found` | 4 | get の id に一致なし |
| `doctor_failed` | 2 | 前提条件のチェック不合格（details.checks に内訳） |
| `verify_failed` | 2 | 検証の不合格（details.checks に内訳） |
| `internal_error` | 2 | 予期しない失敗 |

## MCP

MCP 未対応。CLI を使うこと。将来対応する場合は、ツール定義を CLI のスキーマ（本ガイドと `docs/agent-manifest.json`）から生成し、ツール名はコマンド名と一致させる。

## SDK

SDK 未対応。JSON スキーマと CLI を使うこと（作る需要が出た時点で別作業）。

## 典型フロー

### 1. 状態を確認してから使う

```
node scripts/agent-cli.mjs status
node scripts/agent-cli.mjs doctor
node scripts/agent-cli.mjs list
node scripts/agent-cli.mjs get plan-save
```

### 2. 保存を計画する（必ず計画 first、実行は人間）

```
node scripts/agent-cli.mjs plan-save --url https://example.com/movie.mp4 --format auto --idempotency-key op-1
node scripts/agent-cli.mjs plan-save --url https://example.com/movie.webm --format mp4
# → 2件目は format_not_allowed（終了コード1）で理由が返る。mp4 を選べるのは MP4 互換の候補だけ
# 計画が ok なら、実行は利用者がブラウザで VideoHarbor を開いて保存を押す
node scripts/agent-cli.mjs verify
```

### 3. 失敗したときに調べる

```
node scripts/agent-cli.mjs history --limit 20
node scripts/agent-cli.mjs get <request_id>
node scripts/agent-cli.mjs doctor
```

## 人間専用操作（理由付き）

| 操作 | 理由 |
|---|---|
| save-video / save-retained-media の実行 | downloads、OS の保存ダイアログ、Web Share は利用者の操作が必須 |
| discard-retained-media | 取り消せない破棄。対象はブラウザ文脈にしか存在しない |
| record-video / record-tab の実行 | tabCapture は利用者の操作とブラウザ文脈が必須 |
| record-screen の実行 | getDisplayMedia の選択画面（OS／ブラウザのダイアログ）は自動化しない |
| grant-frame-access | 任意ホスト権限は Chrome の権限ダイアログでのみ付与される |
| Chrome Web Store への提出・支払い | 本人の明示指示でのみ行う（この CLI の範囲外） |
| 映像・音の質感の判定 | 身体感覚の判定は自動化しない |

画面まで案内できる操作（B）: scan-candidates、cancel-save、retry-interrupted、open-onboarding、finish-onboarding、locate-candidate は、利用者が拡張の workspace（`extension/workspace.html`）を開いて行う。主要要素には `data-testid` が付いている（scan、download-tab、record-tab、empty-scan、save-retained-media、discard-retained-media、media-cancel、open-onboarding）。

## ドライランと検証の手順

1. 書き込み相当は plan-save のみで、常にドライラン（ダウンロードは一切しない）。
2. `--dry-run` を付けると履歴にも記録されない。
3. 決定的モード: plan-save に `--now <ISO 8601>` を渡すと出力ファイル名が固定される。
4. 検証: `node scripts/agent-cli.mjs verify` が、リポジトリの check、目録・ガイド・カタログと CLI の一致、未対応サイト拒否と MP4 計画のスモークを一括で返す。
5. 単体テスト: `npm test`（CLI の契約テスト `tests/agent-cli.test.js` を含む）。

## やってはいけない操作

- 拡張の権限を CLI や設定から追加・変更しない（特に広いホスト権限、debugger、webRequest、cookies）。
- ブラウザの localStorage（初回ガイドの状態）を CLI から読み書きしない。
- Chrome Web Store のダッシュボード操作や提出を、この CLI の延長で行わない。
- カタログ（`docs/AGENT_OPERATIONS.md`）に無い操作を場当たりで足さない。先にカタログへ登録する。
- 履歴ファイル（`.agent-state/history.jsonl`）をコミットしない（git 管理外）。
