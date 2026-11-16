# Chrome ウェブストア掲載文 / Chrome Web Store listing

このファイルは、ダッシュボードへ手で写すための原稿です。拡張の実動作（`extension/`）と揃えています。申請ボタンは押していません。

プライバシーポリシーの欄には、このリポジトリの `docs/PRIVACY_POLICY.md` を開いた GitHub 上のファイルURLを入れます。連絡先は同ファイルのアドレスを使います。

This file is the text to copy into the dashboard by hand. It matches what `extension/` actually does. Nothing here submits the item.

For the privacy-policy field, use the GitHub URL of `docs/PRIVACY_POLICY.md` in this repository. Use the contact address printed in that file.

## 掲載の基本 / Listing basics

| 欄 / Field | 日本語 | English |
| --- | --- | --- |
| 名前 / Name | VideoHarbor | VideoHarbor |
| 概要（132字以内） / Summary | 見ている動画を保存したり、その動画・タブ・画面・ウィンドウを録画します。 | Save the video you are watching, or record that video, its tab, or a screen or window. |
| カテゴリ案 / Suggested category | ワークフローと計画（Productivity） | Productivity |
| 言語 / Language | 日本語を既定にする | Offer English as an additional language |

概要は `extension/_locales/ja/messages.json` と `extension/_locales/en/messages.json` の `extDescription` と同じ文です。

The summary is the same sentence as `extDescription` in the Japanese and English locale files.

## 詳細な説明 / Detailed description

### 日本語

VideoHarbor は、今開いているページの動画を手元に残すための拡張機能です。目的は一つで、見ている動画を保存するか、その映像を録画することです。

- 保存: ページ上の動画ファイルや、暗号化されていない HLS / DASH を、選んだ形式で保存します。処理はブラウザの中だけで行います。
- 録画: 選んだ動画だけ、元のタブ全体、または Chrome の共有ダイアログで選んだ画面・ウィンドウを WebM で録画します。マイクは使いません。
- アイコンを押したページだけを調べます。すべてのサイトを常時読む権限はありません。

YouTube（youtube.com、そのサブドメイン、youtube-nocookie.com、youtu.be、youtubekids.com、googlevideo.com など）には対応していません。それらのページでは動画を検出せず、保存も、動画だけの録画も、そのタブの録画も始めません。画面・ウィンドウの録画だけは、共有する範囲を自分で選ぶ操作として使えます。

開発者のサーバーへ動画や閲覧履歴を送る機能はありません。詳しくはリポジトリのプライバシーポリシーを見てください。

保存してよい動画だけに使ってください。著作権や各サイトの利用条件は利用者の責任です。暗号化された動画やライブ配信の直接保存には対応していません。

### English

VideoHarbor keeps a video the person is already watching. It has one purpose: save that video, or record its picture.

- Save: save a video file on the page, or a non-encrypted HLS / DASH stream, in the format the person chooses. Processing stays in the browser.
- Record: record only the chosen video, the whole source tab, or a screen or window chosen in Chrome's sharing dialog. The result is WebM. The microphone is not used.
- The extension looks at a page only after its icon is clicked there. It does not have permanent access to every site.

YouTube is not supported. On youtube.com and its subdomains, youtube-nocookie.com, youtu.be, youtubekids.com, googlevideo.com, and the related hosts named in the extension, VideoHarbor does not detect a video and does not start a save, a video-element recording, or a recording of that tab. Screen and window recording remains available because the person chooses the shared surface.

The extension does not send videos or browsing history to the developer. See the privacy policy in this repository.

Use it only for videos the person may save. Copyright and each site's terms remain the person's responsibility. Encrypted video and live streams cannot be saved directly.

## 単一の目的 / Single purpose

ダッシュボードの「単一の目的」欄には、次をそのまま入れます。

Paste the following into the single-purpose field.

### 日本語

見ている動画を、利用者の操作で保存するか録画する。保存はそのページの動画ファイル、録画は選んだ動画・そのタブ・利用者が選んだ画面またはウィンドウのいずれかである。YouTube の検出、保存、動画だけの録画、タブ録画は行わない。

### English

Save or record a video the person is watching, and only when they ask. Saving stores a video file from that page. Recording captures the chosen video, that tab, or a screen or window the person selects. The extension does not detect, save, or record a YouTube video or a YouTube tab.

## 権限の説明 / Permission justifications

ダッシュボードが権限ごとに理由を求めるときに使います。いずれも「新しい権限を増やす」説明ではなく、今の manifest にある権限の説明です。

Use these when the dashboard asks why each permission is needed. They describe the permissions already in the manifest.

### activeTab

利用者が拡張アイコンを押したタブだけを、その操作のあいだ調べるためです。常時すべてのサイトを開く権限ではありません。YouTube のタブでは、アイコンを押しても動画の検出へ進みません。

Temporary access to the tab where the person clicked the icon, for that action only. It is not standing access to every site. On a YouTube tab, clicking the icon does not continue into video detection.

### scripting

押したページへ、同梱の検出処理と、利用者が開始した動画録画の処理を入れるためです。外部のスクリプトは読みません。YouTube のページにはこの挿入をしません。

Injects the packaged detection script, and the packaged video-recording script after the person starts a video recording. No remote script is loaded. The extension does not inject into a YouTube page.

### downloads

利用者が保存を選んだ動画を Chrome のダウンロードとして書き、そのダウンロードが終わったかを確認するためです。勝手な一括保存や、YouTube のURLの保存には使いません。

Writes the video the person chose as a Chrome download, and checks whether that download finished. It is not used for silent bulk saving or for a YouTube URL.

### storage

作業タブの候補と進行状況を、ブラウザの session storage に置くためです。同期ストレージは使いません。作業タブを閉じると候補は消し、ブラウザ終了でも session は消えます。

Keeps the open workspace's candidates and progress in session storage. Sync storage is not used. Candidates are removed when the workspace tab closes, and session storage is cleared when the browser quits.

### tabCapture

利用者が「元のタブ全体」を選んで録画を開始したときだけ、そのタブの映像と音声を録るためです。YouTube のタブでは stream を取得しません。マイク権限はありません。

Records the picture and sound of the source tab only after the person chooses "the original tab" and starts. It does not obtain a stream for a YouTube tab. There is no microphone permission.

### 任意のホスト権限 optional host permissions（`https://*/*` と `http://*/*`）

インストール時には付与されません。別サイトの埋め込みを調べるとき、または分割された動画の配信元から取得するとき、画面に出した特定のサイトだけをブラウザが確認します。宣言が広く見えるのは、利用者が許可した個別のサイトを後から足せるようにするためです。拡張は「すべてのサイト」を一括では要求しません。許可は `chrome://extensions` から外せます。YouTube 系のホストは、許可ボタンの対象にしません。

These are not granted at install. Chrome asks for one specific site only when the person wants an embed inspected, or when a split video must be fetched from the host shown on screen. The manifest pattern is broad so that a single approved origin can be added later. The extension never asks for every site in one grant. Permission can be removed at chrome://extensions. YouTube hosts are not offered for that grant.

## リモートコードはない / No remote code

- Manifest V3 で、拡張のページの CSP は `script-src 'self'` です。
- 実行時に外部の JavaScript、WASM、CSS、解析タグを読みません。
- `eval` やリモートの `import()` はありません。Worker も拡張に同梱したファイルです。
- ビルド手順はなく、ストアへ出す中身は `extension/` のファイルそのものです。

- Manifest V3. Extension pages use `script-src 'self'`.
- No external JavaScript, WASM, CSS, or analytics tag is loaded at runtime.
- There is no `eval` and no remote `import()`. Workers are files packaged with the extension.
- There is no build step. The store package is the files in `extension/`, unchanged.

## プライバシー質問への答え / Data-use answers

ダッシュボードのプライバシー設問では、次の理解で答えてください。詳細な保持期間は `docs/PRIVACY_POLICY.md` が正です。

Answer the dashboard privacy questions with the following understanding. Retention detail lives in `docs/PRIVACY_POLICY.md`.

- 開発者はユーザーデータを収集しません。動画、URL、タイトル、録画、識別子を開発者のサーバーへ送る処理がないためです。
- 「ウェブサイトのコンテンツ」は、保存または録画という単一の目的のため、利用者のブラウザの中だけで扱います。配信元への通信は、利用者が保存を指示した動画をその配信元から取るためのもので、開発者への転送ではありません。
- 販売しない。単一の目的と関係ない利用をしない。信用力の判定や貸付に使わない。
- アカウント、広告、位置情報、健康、金融、通信文、閲覧履歴の収集機能はありません。
- 端末内に残るもの: session storage の作業情報（作業タブを閉じる、またはブラウザ終了で消える）、利用者が自分で保存したファイル、Chrome のダウンロード履歴。

- The developer does not collect user data. Videos, URLs, titles, recordings, and identifiers are not sent to a developer server.
- Website content is handled only inside the person's browser, for the single purpose of saving or recording. A request to a media host fetches the video the person asked to save. It is not a transfer to the developer.
- Data is not sold, not used for a purpose unrelated to the single purpose, and not used to judge creditworthiness or for lending.
- There is no account, advertising, location, health, financial, message, or browsing-history collection feature.
- What remains on the device: workspace notes in session storage (cleared when the workspace tab closes or the browser quits), files the person chose to save, and Chrome's download history.

## 画像 / Images

| ファイル | サイズ | 用途 |
| --- | --- | --- |
| `store/screenshots/01-save.png` | 1280×800 | 保存画面 |
| `store/screenshots/02-record.png` | 1280×800 | 録画対象の選択。画面・ウィンドウを含む |
| `store/screenshots/03-unsupported-site.png` | 1280×800 | 未対応サイトの表示 |
| `store/promo-tile-440x280.png` | 440×280 | 小さいプロモーションタイル |
| `store/icon-128.png` | 128×128 | ストアアイコン。絵は中央の約96×96、周囲は透明 |

スクリーンショットは、個人情報のないローカルの合成ページを Playwright で開いて撮っています。実在の第三者サイトは使っていません。作り直すときは `node scripts/capture-store-assets.mjs` です。

Screenshots were taken with Playwright on local synthetic pages that contain no personal information. No live third-party site was used. Regenerate them with `node scripts/capture-store-assets.mjs`.
