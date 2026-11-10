# プライバシーポリシー / Privacy Policy

最終更新 / Last updated: 2026-11-10

VideoHarbor は、見ている動画を手元のブラウザで保存または録画するための拡張機能です。この文書が、Chrome ウェブストアのプライバシーポリシー欄に載せる文書です。

VideoHarbor is a browser extension that saves or records a video the person is watching, on that person's own device. This file is the privacy policy for the Chrome Web Store listing.

連絡先 / Contact: deeple+videoharborstaff@inkboxmail.com

不具合の連絡に、署名付きのURL、Cookie、アクセストークン、個人のプロファイル、私的な録画ファイルは含めないでください。合成したURLやローカルのテストデータで状況を書いてください。

Please do not include signed URLs, cookies, access tokens, personal browser profiles, or private recordings in a report. Describe the situation with synthetic URLs or local test data.

## 日本語

### 処理は端末の中で完結します

動画の探索、形式の確認、HLS/DASH の組み立て、MP4 へのまとめ、録画は、すべて利用中のブラウザの中で行います。開発者のサーバーへ動画、ページのURL、タイトル、録画、操作履歴を送る処理はありません。アカウント登録、解析、広告、クラッシュレポートの送信もありません。

### 発生する通信

通信が起きるのは、利用者が保存を指示した動画を、その動画を配信しているサイトから取得するときだけです。

- ブラウザ標準のダウンロードは、Chrome 自身がその配信元へ要求します。Chrome の仕様でリダイレクトを追うことがあります。
- HLS や DASH のように分割された動画を拡張がまとめるときは、利用者が許可した配信元だけへ取得します。この取得には Referer を付けません。別の配信元へリダイレクトされた取得は中断します。
- 画面・ウィンドウの録画は、選んだ映像をファイルとして端末に残すだけで、アップロードしません。
- 開発者、解析事業者、見知らぬ収集用サーバーへの送信はありません。

YouTube（youtube.com とそのサブドメイン、youtube-nocookie.com、youtu.be、youtubekids.com、googlevideo.com など）では、動画を検出しません。保存も、動画だけの録画も、そのタブの録画も始めません。画面・ウィンドウの録画だけは、共有する範囲を利用者が自分で選ぶ操作として残しています。

### 保存する情報と消える時期

- 作業タブを開いているあいだ、ページの候補と処理状況をブラウザの session storage に置きます。クラウド同期の storage は使いません。作業タブを閉じると候補やタイトルは消します。ブラウザを終了したときも session storage は消えます。
- 保存を開始したあとに作業タブを閉じた場合、終わっていない直接保存の完了確認に必要な最小限の情報だけを、その保存が終わるまで残すことがあります。
- 利用者が自分で保存したファイルと、Chrome のダウンロード履歴は、拡張を閉じても残ります。拡張はそれらを自動では消しません。
- 録画データは、保存が終わるまで作業タブのメモリ、または利用者が選んだファイルにあります。作業タブを閉じたりブラウザが落ちたりすると、未保存の録画は失われます。
- サイトの Cookie やパスワードを、拡張が独自に読み出して保管することはありません。許可した配信元への取得は、ブラウザがもともと持っているログイン状態に従います。

### 権限を使う理由

- 拡張アイコンを押したページだけを、一時的に調べます。常時すべてのサイトを読む権限はありません。
- 別サイトの埋め込みや分割配信を保存するときだけ、画面に出した特定のサイトへのアクセスをブラウザが確認します。YouTube 系のホストは許可の対象にしません。
- ダウンロード権限は、利用者が選んだ動画の保存と、その保存の完了確認に使います。
- タブの録画は、利用者が「元のタブ全体」を選んで開始したときだけです。YouTube のタブでは開始しません。
- 画面・ウィンドウの録画は、Chrome 標準の共有ダイアログで対象を選んだときだけ始まります。マイクは使いません。

### 子どもの個人情報

この拡張は子どもから個人情報を集めることを目的にしていません。開発者のもとへ個人情報は送られません。

## English

### Processing stays on the device

Finding a video, checking its format, assembling HLS or DASH, packaging MP4, and recording all happen inside the browser that is in use. The extension does not send videos, page URLs, titles, recordings, or activity logs to the developer. There is no account, analytics, advertising, or crash-report upload.

### Network requests that do happen

A network request happens only when the person asks to save a video and the browser then requests that video from the site that hosts it.

- Chrome's own download talks to that host. Chrome may follow redirects under Chrome's own rules.
- When the extension assembles a split HLS or DASH stream, it requests only origins the person has allowed. Those requests send no Referer. A redirect to a different host is aborted.
- Screen and window recording keeps the chosen picture in a local file. It is not uploaded.
- Nothing is sent to the developer, to an analytics service, or to any other collection server.

On YouTube (youtube.com and its subdomains, youtube-nocookie.com, youtu.be, youtubekids.com, googlevideo.com, and the related hosts named in the extension) the extension does not detect a video. It does not save, record the video element, or record that tab. Screen and window recording remains available because the person chooses the shared surface.

### What is stored, and for how long

- While a workspace tab is open, candidate information and progress are kept in the browser's session storage. Sync storage is not used. Closing the workspace tab clears candidates and titles. Quitting the browser clears session storage as well.
- If a direct save has already started and the workspace tab is then closed, the smallest information needed to confirm that save may remain until the save finishes.
- Files the person saved, and Chrome's download history, remain after the extension is closed. The extension does not delete them.
- A recording stays in the workspace tab's memory, or in a file the person selected, until it is saved. Closing the tab or crashing the browser loses an unsaved recording.
- The extension does not read or store site cookies or passwords on its own. A fetch to an origin the person allowed uses the browser's existing login state.

### Why permissions are used

- The extension inspects only the page where its icon was clicked, and only for that visit. It does not have permanent access to every site.
- Access to a specific other site is requested only when the person chooses to save an embed or a split stream, and only after that site is shown on screen. YouTube hosts are not offered for that grant.
- The downloads permission saves the video the person chose and checks that this extension's download finished.
- Tab recording starts only after the person chooses "the original tab" and presses start. It does not start on a YouTube tab.
- Screen and window recording starts only after the person picks a surface in Chrome's sharing dialog. The microphone is not used.

### Children

This extension is not designed to collect personal information from children. No personal information is sent to the developer.
