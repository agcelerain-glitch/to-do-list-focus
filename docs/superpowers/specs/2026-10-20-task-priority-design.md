# 優先度（3段階）機能 設計書

作成日: 2026-10-20

## 背景・目的

タスクが増えたときに「**どれから手をつけるか**」を一目で判断できるようにする。
ユーザーの根本課題は優先度判断であり、カテゴリ分類や締め切り管理は今回のスコープ外（YAGNI）。

当初案の「色分けフラグ」は、色だけに頼ると既存の**色覚特性機能**（色覚特性モードで CSS 変数の色を上書きする仕組み）と競合する。
そこで「色 + 形 + テキスト」の三重符号化バッジとして実装し、色が変わっても意味が保たれる形にする。

## スコープ

- 各タスクに 3 段階の優先度（高 / 中 / 低）＋ 未設定を持たせる
- 未達リストを優先度順に自動並べ替え
- タイトル横に優先度バッジ（形 + ラベル + 色）を表示
- 作成 / 編集パネルで優先度を選択
- 色覚特性モードとの統合（優先度専用の色変数を新設）
- i18n（ja / en / zh）対応

### スコープ外

- カテゴリ / タグ分類
- 締め切り・リマインダー
- 優先度によるフィルター切替（将来の拡張候補）
- ドラッグによる手動並べ替え

## データモデル

Firestore の各 todo に `priority` フィールドを追加する。

| フィールド | 型 | 値 |
|-----------|----|----|
| `priority` | string \| null | `'high'` / `'mid'` / `'low'` / `null`（未設定） |

- 新規作成時の既定値は `null`（＝あとで付ける方式）。
- 既存タスクには `priority` フィールドが存在しない → 読み取り側で `undefined` を `null` とみなす。
  **マイグレーション不要。**

### 影響ファイル: `front/src/hooks/useTodos.js`

- `add(title, content, priority = null)` … `addDoc` のペイロードに `priority` を追加
- `update(id, title, content, priority = null)` … `updateDoc` のペイロードに `priority` を追加
- 呼び出し側（`CreatePanel` → `MainScreen`/`App` の `onCreate`、`TodoEditModal` の `onSave`）のシグネチャを
  `(title, content, priority)` に合わせて更新する

## 並び順ロジック

### 未達（pending）リスト

```
高 → 中 → 低 → 未設定（最下部にまとめる）
　各グループ内は従来どおり createdAt の新しい順
```

- `useTodos` は `orderBy('createdAt', 'desc')` で取得済み。JS の `Array.prototype.sort` は安定ソートなので、
  取得済みの「新しい順」を保ったまま優先度キーで並べ替えればよい。
- 優先度の並び順キー: `{ high: 0, mid: 1, low: 2 }`、未設定（null/undefined）は `3`。

### 達成済（completed）リスト

- **従来どおり完了日順（取得順）のまま。優先度ソートはしない。**
- バッジは達成済みでも表示する。

### 影響ファイル: `front/src/components/TodoList.jsx`

- 現状 17-18 行の `pending` / `completed` 抽出後、`pending` にのみ優先度ソートを適用する。
- ソート順マップは共有ユーティリティ（例: `front/src/constants/priority.js`）に切り出し、
  バッジ表示・入力 UI と共通化する。

## 優先度バッジ（色覚特性対応の核心）

タイトルの左に小さなバッジを表示。**形・ラベル・色の三重符号化**で、色が変わっても必ず区別できる。
アイコンは既存スタックの Font Awesome 6 を使う。

| 優先度 | アイコン（形・向き） | ラベル(ja) | 既定色(normal) | CSS 変数 |
|--------|---------------------|-----------|----------------|----------|
| 高 | `fa-angles-up`（二重上矢印） | 高 | 赤橙 `#DC2626` | `--prio-high` |
| 中 | `fa-minus`（横棒） | 中 | 琥珀 `#D97706` | `--prio-mid` |
| 低 | `fa-angles-down`（二重下矢印） | 低 | 青 `#2563EB` | `--prio-low` |
| 未設定 | （バッジなし） | — | — | — |

- 色は**補助**。アイコンの向き（上 / 横 / 下）＋ラベル文字だけで判別可能。
- `aria-label` に「優先度: 高」等を付与（i18n 経由）。
- 優先度専用の CSS 変数 `--prio-high / --prio-mid / --prio-low` を新設し、
  既存の意味的変数（`--danger` / `--success` / `--primary`）とは**分離**する。
  → 操作ボタンの色と混ざらない。

### 影響ファイル: `front/src/components/TodoItem.jsx`

- `todo-item-title` の前に `span.priority-badge.prio-{high|mid|low}` を追加。
- `todo.priority` が null/undefined のときは何も描画しない。

## 色覚特性モードとの統合

`:root` と各モードクラスで優先度変数を定義・上書きする。
アイコンの向きとラベルは全モード共通なので、色がどう変わっても意味は保たれる。

| モード | high | mid | low | 備考 |
|--------|------|-----|-----|------|
| 通常 `:root` | `#DC2626` | `#D97706` | `#2563EB` | 赤橙 / 琥珀 / 青 |
| 緑色弱 `.color-deuteranopia` | `#C2410C` | `#6B7280` | `#1D4ED8` | 赤緑を避け 橙 / グレー / 青 の軸 |
| 赤色弱 `.color-protanopia` | `#B45309` | `#6B7280` | `#1D4ED8` | 同上 |
| 高コントラスト `.color-highcontrast` | `#CC0000` | `#000000` | `#0000CC` | 背景は白・バッジは太字＋枠線で補強 |

### 影響ファイル: `front/src/index.css`

- `:root` に `--prio-high / --prio-mid / --prio-low` を追加（9-23 行付近）。
- `.priority-badge` と `.prio-*` のスタイルを追加（アイコン + ラベルの小バッジ、44px タッチ干渉しないサイズ）。
- Color Accessibility Overrides セクション（1220 行付近）の各モードに優先度変数の上書きを追加。
- 高コントラストモードではバッジに `border` と `font-weight: bold` を付与。

## 入力 UI

作成パネル・編集パネルで、タイトル入力の下に **高・中・低の 3 ボタン**（色 + アイコン + 文字）を横並び。

- もう一度同じボタンをタップすると選択解除（＝未設定に戻せる）。
- 作成パネルを開いた初期状態は**未選択**（`priority = null`）。
- 編集パネルは既存タスクの `priority` を初期表示。
- タッチターゲットは既存 UI に合わせ 44px 以上を確保。

### 影響ファイル

- `front/src/components/CreatePanel.jsx`
  - `priority` state（初期 `null`）を追加、`submit` で `onCreate(title, content, priority)` を呼ぶ。
  - 送信後は `priority` も `null` にリセット。
- `front/src/components/TodoEditModal.jsx`
  - `priority` state を追加、`todo.priority` で初期化、`onSave(id, title, content, priority)` を呼ぶ。
- ボタン群は共通コンポーネント（例: `front/src/components/PrioritySelector.jsx`）に切り出し、
  作成・編集で再利用する。

## i18n

`front/src/i18n/translations.js` の各言語に優先度ラベルと aria 文言を追加する。

```
priority: {
  label: '優先度',      // 'Priority' / '优先级'
  high:  '高',          // 'High' / '高'
  mid:   '中',          // 'Mid'  / '中'
  low:   '低',          // 'Low'  / '低'
  none:  '未設定',       // 'None' / '未设置'
  aria:  '優先度: {level}', // 'Priority: {level}' / '优先级: {level}'
}
```

ja / en / zh の 3 言語すべてに追加する（既存は 3 言語対応のため）。

## コンポーネント境界

| 単位 | 役割 | 依存 |
|------|------|------|
| `constants/priority.js` | 優先度キー・順序マップ・アイコン名の単一の情報源 | なし |
| `PrioritySelector.jsx` | 高/中/低の選択 UI（再タップで解除） | constants, AppContext(i18n) |
| `TodoItem.jsx` バッジ部 | 優先度の表示（形+ラベル+色） | constants, AppContext(i18n) |
| `TodoList.jsx` ソート部 | pending を優先度順に並べ替え | constants |
| `useTodos.js` | `priority` の永続化 | Firestore |
| `index.css` `--prio-*` | 色覚モード別の色定義 | なし |

## テスト観点

- `priority` 未設定の既存タスクがエラーなく最下部に表示される
- 高→中→低→未設定の順に並ぶ／同一優先度内は新しい順
- 達成済みリストは完了日順のまま、バッジは表示される
- 作成時に未選択で追加できる／再タップで解除できる
- 4 つの色覚特性モードすべてでバッジの形とラベルが保たれる
- ja / en / zh でラベルが切り替わる

## 段階的実装の順序（想定）

1. `constants/priority.js` と i18n ラベル追加（土台）
2. `useTodos` に `priority` 永続化、呼び出し側シグネチャ更新
3. `PrioritySelector` 作成 → `CreatePanel` / `TodoEditModal` に組み込み
4. `TodoItem` バッジ表示
5. `TodoList` の pending ソート
6. `index.css` に `--prio-*` と各色覚モードの上書き・バッジスタイル
7. 動作確認 → コミット → push（自動デプロイ）
