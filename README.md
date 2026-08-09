# Todo List Focus

スマホ最適化のシンプルなTodoリストWebアプリ。  
Google ログインで即使い始められ、スワイプ操作でスムーズにタスクを管理できます。

## 機能

- **Googleログイン** — Firebase Authentication
- **スライド画面演出** — タスク追加・一覧を上下スライドで切り替え
- **スワイプ操作** — 下スワイプで追加画面、上スワイプで一覧画面
- **リアルタイム同期** — Firestore でデバイス間即時反映
- **未達 / 達成済 管理** — 区切り線で分類、完了・復活・削除が可能
- **スマホ最優先 UI** — 44px 以上のタッチターゲット、Font Awesome アイコン

## 技術スタック

| レイヤー | 技術 |
|--------|------|
| フロントエンド | React 18 + Vite |
| ホスティング | Vercel |
| 認証 | Firebase Authentication (Google) |
| データベース | Cloud Firestore |
| アイコン | Font Awesome 6 (CDN) |

## ディレクトリ構成

```
todo_list004/
├── front/               # Vite + React フロントエンド
│   ├── src/
│   │   ├── App.jsx
│   │   ├── firebase/config.js
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useTodos.js
│   │   └── components/
│   │       ├── Login.jsx
│   │       ├── MainScreen.jsx
│   │       ├── CreatePanel.jsx
│   │       ├── TodoList.jsx
│   │       └── TodoItem.jsx
│   └── .env.example     # 環境変数テンプレート
├── firebase/            # Firestore ルール・設定
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   └── firebase.json
└── vercel.json          # Vercel ビルド設定
```

## ローカル開発

### 1. リポジトリをクローン

```bash
git clone https://github.com/agcelerain-glitch/to-do-list-focus.git
cd to-do-list-focus
```

### 2. 環境変数を設定

```bash
cp front/.env.example front/.env
```

`front/.env` に Firebase プロジェクトの値を入力：

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=to-do-list-focus.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=to-do-list-focus
VITE_FIREBASE_STORAGE_BUCKET=to-do-list-focus.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=951719597465
VITE_FIREBASE_APP_ID=1:951719597465:web:...
```

> **Firebase Console** → プロジェクトの設定 → マイアプリ からコピーできます。

### 3. 依存関係インストール & 起動

```bash
cd front
npm install
npm run dev
```

## デプロイ

### Firestore ルールのデプロイ

```bash
cd firebase
firebase deploy --only firestore --project to-do-list-focus
```

### Vercel へのデプロイ

**初回（GitHub 連携）:**
1. [vercel.com/new](https://vercel.com/new) でこのリポジトリをインポート
2. **Root Directory** を `front` に設定
3. 下記の環境変数を追加（手動で必要な作業）

**環境変数（Vercel ダッシュボード → Settings → Environment Variables）:**

| Key | Value |
|-----|-------|
| `VITE_FIREBASE_API_KEY` | Firebase の apiKey |
| `VITE_FIREBASE_AUTH_DOMAIN` | `to-do-list-focus.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `to-do-list-focus` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `to-do-list-focus.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `951719597465` |
| `VITE_FIREBASE_APP_ID` | Firebase の appId |

**以降は GitHub main ブランチへの push で自動デプロイ。**

## Firebase のセットアップ（初回のみ）

### Google 認証を有効化

1. [Firebase Console](https://console.firebase.google.com) → to-do-list-focus
2. Authentication → Sign-in method → Google → 有効にする

### Vercel ドメインを許可

1. Authentication → Settings → 承認済みドメイン
2. Vercel で発行された URL（例: `your-app.vercel.app`）を追加

### Firestore データベース作成

1. Firestore Database → データベースを作成
2. ロケーション: `asia-northeast1`（東京）
3. 本番環境モードで開始（ルールは自動適用）

## Firebase キーの JSON について

このアプリは**フロントエンドのみ**で動作するため、Admin SDK の `serviceAccountKey.json` は不要です。  
`.env` に記載する値（apiKey 等）は Firebase の**ウェブ公開キー**であり、
Firestore セキュリティルールによって保護されています。

バックエンド（Cloud Functions 等）を追加する場合は、サービスアカウントキーを  
**絶対に Git にコミットせず**、環境変数（JSON 文字列化）として管理してください。

## Firestore セキュリティルール

認証済みユーザーが自分のデータのみ読み書きできる設計：

```
match /users/{userId}/todos/{todoId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

## ライセンス

MIT
