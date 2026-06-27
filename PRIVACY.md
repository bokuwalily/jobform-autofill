# プライバシーポリシー / Privacy Policy

**就活フォーム自動入力（Job Form Autofill）**
最終更新日: 2026-06-10

---

## 日本語

### 収集する情報
本拡張機能は、利用者が拡張機能のポップアップに**自ら入力した**以下のプロフィール情報のみを扱います。

- 氏名・フリガナ
- 生年月日・性別
- 住所（郵便番号・都道府県・市区町村・番地・建物名）
- 電話番号・メールアドレス
- 学歴情報（学校名・学部・学科・卒業年月・学校区分など）

### データの保存場所
入力された情報は、**利用者の端末内（ブラウザの `chrome.storage.local`）にのみ**保存されます。開発者のサーバーや第三者に送信・アップロード・同期されることは**一切ありません**。

### データの利用目的
保存されたプロフィールは、利用者が「自動入力」ボタンを押したときに、**その場で開いているフォームの入力欄を埋める**目的にのみ使用されます。

### 外部送信・第三者提供
- 外部サーバーへの送信: **なし**
- アナリティクス・トラッキング: **なし**
- 第三者へのデータ提供・販売: **なし**
- リモートコードの読み込み・実行: **なし**

本拡張機能はネットワーク通信を行いません。完全にオフライン・ローカルで動作します。

### 権限について
- **storage**: プロフィールを端末内に保存するため。
- **全サイトでの実行（コンテンツスクリプト）**: 企業ごとに異なるエントリーフォームのページ上で、入力欄を検出して値を埋めるため。読み取った内容は端末内の処理にのみ使われ、外部に送信されません。

### データの保持と削除
データは利用者が拡張機能のポップアップで内容を消去するか、拡張機能をアンインストールするまで端末内に保持されます。アンインストール時に削除されます。

### 子どもの利用
本拡張機能は13歳未満の子どもを対象としていません。

### お問い合わせ
ご質問は次の連絡先までお願いします: **contact@bokuwalily.com**

### 変更について
本ポリシーは必要に応じて更新されます。重要な変更がある場合は本ページで告知します。

---

## English (summary)

**Job Form Autofill** stores the profile you enter (name, address, contact, education, etc.) **only in your browser's local storage (`chrome.storage.local`) on your own device.** It is **never** transmitted to any server, shared with third parties, or used for analytics. The extension performs **no network communication** and loads **no remote code**. Data is used solely to fill in form fields on the page you are viewing when you click the "Autofill" button, and is removed when you clear it or uninstall the extension.

Permissions: `storage` (save your profile locally); content-script access to web pages (detect and fill form fields locally — nothing is sent anywhere).

Contact: contact@bokuwalily.com
