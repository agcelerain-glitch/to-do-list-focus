# Stopフック: 自動整形＋build検証 設計書

作成日: 2026-10-20

## 背景・目的

コード変更後に「整形忘れ」「build を壊したまま push」が起きないよう、
Claude Code の **Stop フック**で停止時に自動で整形と build 検証を行う。

既存の `stop-check.mjs` は「停止前セルフチェック（3項目リマインダ）」を毎回返す実装で、
変更が無いときにも停止を引き止めて煩わしかった。これを廃止し、
**front に未コミット変更があるときだけ**整形と build 検証を走らせる実務的なフックに作り替える。

デプロイ（commit/push）は暴発を避けるため **hook では行わず**、
build が通ったことを確認したうえで Claude（実行者）が区切りで実行する。

## スコープ

- 停止時に、未コミットの `front/` 変更を検知する
- 対象ファイルに prettier を適用して整形する
- `front` を `npm run build` して壊れていないか検証する
- build 失敗は停止を引き止めて修正を促す（`exit 2`）
- build 成功時は「整形件数・build OK・push は実行者が」を伝える（`exit 2`）
- 無限ループ防止（`stop_hook_active` で即抜け）

### スコープ外

- hook による自動 commit / push（＝実行者が行う）
- コミット前フック（PreToolUse 等）での検証
- front 以外（firebase functions / docs）の build・lint
- 既存コード全体の一括整形（意図しない大量 diff を避ける）
- 編集のたびの即時 build（停止時にまとめて実行する方針）

## 動作フロー

```
停止 → Stop フック発火（stdin で JSON を受領）
 ├ stop_hook_active === true → exit 0        … 継続の結果の再停止。ループ防止
 └ false →
    1. git status --porcelain で未コミット変更を取得
    2. front/ 配下の変更が無い → exit 0        … 静かに停止許可（リマインダ無し）
    3. front/ 配下に変更あり →
       a. 対象 front/src/**/*.{js,jsx,css} に prettier --write
       b. npm --prefix front run build
          ├ 失敗 → exit 2 + stderr（build エラー末尾を提示し修正を促す）
          └ 成功 →
             ├ 整形差分あり → exit 2 + stderr（「整形N件・build OK。整形差分を add して commit→push を」）
             └ 整形差分なし → exit 0（build OK。停止許可。無駄な引き止めをしない）
```

- `exit 2` + stderr は Claude Code にフィードバックして継続させる仕様。
- 整形で差分が出た場合は、実行者が add し忘れないよう `exit 2` で必ず知らせる。
- 整形差分が無く build も通る場合は `exit 0` で静かに停止を許可する（「何度も停止」の煩わしさを避ける）。
- build が通った後の push は実行者が行う（hook は push しない）。
- `exit 2` は継続の結果の再停止で `stop_hook_active=true` となり、2回目は即 `exit 0`。
  → 引き止めは最大1回でループしない。

## 変更検知

- `git status --porcelain`（staged / unstaged / untracked をまとめて取得）を使う。
- 各行のパスを見て `front/` で始まるものだけを対象にする。
- build は `front/` に変更があるときだけ実行（`docs/` や `.claude/` だけの変更では走らせない）。
- 整形対象は `front/src/**/*.{js,jsx,css}` のうち、上記で検知した未コミット変更ファイル。
  - `dist/`・`node_modules/` は対象外。

### 「編集→停止→整形/build→commit→push」の順序について

hook は作業ツリーの未コミット変更を見るため、**commit 前の停止**で発火して整形・build する。
Claude は「編集 → いったん停止（ここで hook が整形/build）→ 整形差分も含めて commit → push」
の順で進める。push 後の再停止は `stop_hook_active=true` で即抜けるため二重実行しない。

## prettier 設定

- `front/package.json` の devDependencies に `prettier` を追加。
- `front/.prettierrc.json` を既存コードのスタイルに合わせる（整形差分を最小化）:

```json
{
  "semi": false,
  "singleQuote": true,
  "jsxSingleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all"
}
```

- `front/.prettierignore`:

```
dist
node_modules
```

- 既存コードはセミコロンなし・シングルクォート・2スペースインデントのため、
  上記設定なら既存ファイルを整形しても差分はほぼ出ない想定。

## 差し戻し / 通知メッセージ

| 状況 | exit | stderr の要点 |
|------|------|--------------|
| `stop_hook_active` | 0 | （出力なし） |
| front 変更なし | 0 | （出力なし。静かに停止許可） |
| build 失敗 | 2 | 「front の build に失敗。以下を修正して」＋ build 出力末尾（約20行） |
| build 成功＋整形あり | 2 | 「prettier で N 件整形・build OK。整形差分を add して commit→push を（push は実行者）」 |
| build 成功＋整形なし | 0 | （出力なし。build OK として静かに停止許可。無駄な引き止めをしない） |

## エラーハンドリング / 環境

- 実行環境は Windows。hook は Node.js で動作（既存踏襲）。
- 外部コマンドは `child_process.spawnSync` で同期実行（git / npx prettier / npm run build）。
- `spawnSync` は `shell: true`、cwd はリポジトリルート。build は `npm --prefix front run build`。
- prettier が未インストール（`npx prettier` が失敗）なら整形をスキップして警告し、build は続行。
- build 出力は長いので stderr へは末尾20行程度に要約。
- stdin の JSON が壊れていても落とさない（従来どおり try/catch）。
- git / npm が無い等の予期せぬ失敗時は、停止を妨げないよう安全側（`exit 0`）に倒す。

## コンポーネント境界

| 単位 | 役割 | 依存 |
|------|------|------|
| `readInput()` | stdin の JSON を読む（`stop_hook_active` 判定） | なし |
| `changedFrontFiles()` | `git status --porcelain` から front 変更を抽出 | git |
| `formatFiles(files)` | 対象ファイルに prettier --write | npx prettier |
| `buildFront()` | `npm --prefix front run build` を実行し結果を返す | npm |
| `main()` | フロー制御と exit code / stderr の決定 | 上記 |

## テスト観点

- build を意図的に壊した状態で停止 → `exit 2` と build エラー要約が出る。
- 整形差分が出るファイルを変更 → 整形後に build OK のメッセージ（`exit 2`）。
- front 変更ありで build OK・整形差分なし → `exit 0` で静かに停止許可（引き止めない）。
- 作業ツリーがクリーン（commit 済み）→ 無干渉で停止許可（`exit 0`）。
- `front` 以外（docs 等）のみ変更 → build を走らせず停止許可。
- 継続の結果の再停止（`stop_hook_active=true`）→ 即 `exit 0`（ループしない）。
- prettier 未導入の環境 → 整形スキップ警告のうえ build は実行される。

## 段階的実装の順序（想定）

1. `front` に prettier を導入（devDependency・`.prettierrc.json`・`.prettierignore`）
2. `stop-check.mjs` を作り替え（検知 → 整形 → build → 判定）
3. 手動検証（build 壊し／整形差分／クリーン／front外のみ／ループ防止）
4. knower へ実装パターン・落とし穴を一般化して追記
5. 設定ファイル（`.claude/settings.local.json`）の Stop 登録は現状のままで可
