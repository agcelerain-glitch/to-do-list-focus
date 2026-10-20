# Stopフック 自動整形＋build検証 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 停止時に front の未コミット変更を prettier 整形し `npm run build` で検証する Stop フックを作る。

**Architecture:** 既存 `.claude/hooks/stop-check.mjs`（セルフチェック＋ループ防止）を、「未コミットの front 変更があるときだけ整形→build 検証し、結果を exit code で伝える」実装へ全面改修する。commit/push は hook では行わない。

**Tech Stack:** Node.js (ESM, `.mjs`) / `child_process.spawnSync` / git / prettier / npm (Vite build) / Windows。

## Global Constraints

- 実行環境は Windows。hook は Node.js ESM。外部コマンドは `spawnSync(..., { shell: true })` で呼ぶ（Windows の `npm.cmd` / `npx.cmd` 対策）。
- hook は cwd = リポジトリルートで実行される前提。
- **commit / push は hook では行わない**（実行者が区切りで実行）。
- 整形対象は未コミットの `front/src/**/*.{js,jsx,css}` のみ（既存コード全体の一括整形はしない）。
- prettier は `npx --no-install prettier` で呼び、未導入ならスキップ（build は続行）。
- exit 規約：build 失敗 or 整形差分あり → `exit 2`（stderr に理由）。front 変更なし / 整形不要で build OK / `stop_hook_active` → `exit 0`。
- `.claude/settings.local.json` の Stop 登録は現状のまま（変更不要）。
- prettier 設定（verbatim）：`semi:false` / `singleQuote:true` / `jsxSingleQuote:false` / `tabWidth:2` / `trailingComma:"all"`。

---

### Task 1: front に prettier を導入

**Files:**
- Modify: `front/package.json`（devDependencies に prettier 追加）
- Create: `front/.prettierrc.json`
- Create: `front/.prettierignore`

**Interfaces:**
- Consumes: なし
- Produces: `npx prettier` が `front` で利用可能になる。整形ルールは既存コードスタイル（セミコロンなし・シングルクォート・2スペース）に一致し、既存ファイルを整形しても差分ゼロ。

- [ ] **Step 1: prettier を devDependency として導入**

Run:
```powershell
npm --prefix front install -D prettier
```
Expected: `front/package.json` の devDependencies に `prettier` が追加され、`front/package-lock.json` が更新される。

- [ ] **Step 2: `front/.prettierrc.json` を作成**

```json
{
  "semi": false,
  "singleQuote": true,
  "jsxSingleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all"
}
```

- [ ] **Step 3: `front/.prettierignore` を作成**

```
dist
node_modules
dev-dist
```

- [ ] **Step 4: 既存コードが設定と一致し差分が出ないことを確認**

Run:
```powershell
node "front/node_modules/prettier/bin/prettier.cjs" --check "front/src/**/*.{js,jsx,css}"
```
Expected: `All matched files use Prettier code style!`
もし差分が出るファイルがあれば、そのファイルは既存スタイルと設定の乖離がある。`.prettierrc.json` を既存スタイルへ寄せるか、対象を個別整形してから次へ進む（大量 diff を避けるため、設定側の調整を優先）。

- [ ] **Step 5: コミット**

```powershell
git add front/package.json front/package-lock.json front/.prettierrc.json front/.prettierignore
git commit -m "chore: front に prettier を導入（既存スタイル準拠の設定）"
```

---

### Task 2: stop-check.mjs を自動整形＋build検証へ改修

**Files:**
- Modify (全面書き換え): `.claude/hooks/stop-check.mjs`

**Interfaces:**
- Consumes: Task 1 で導入した prettier（`npx --no-install prettier`）。
- Produces: Stop フックの最終挙動。stdin の JSON（`stop_hook_active`）を読み、front 変更の有無・整形差分・build 成否に応じて `exit 0 / 2` を返す。

- [ ] **Step 1: `.claude/hooks/stop-check.mjs` を以下で全面置換**

```js
#!/usr/bin/env node
/**
 * Stop フック: 停止時に front の未コミット変更を整形し build 検証する。
 *
 * 挙動:
 *   - stop_hook_active=true（継続の結果の再停止）→ exit 0（ループ防止）
 *   - front/ に未コミット変更なし → exit 0（静かに停止許可）
 *   - 変更あり → prettier 整形 → npm run build
 *       build 失敗        → exit 2（build エラー末尾を提示）
 *       整形差分あり+OK   → exit 2（整形件数を知らせ add→commit→push を促す）
 *       整形差分なし+OK   → exit 0（無駄な引き止めをしない）
 *   - commit/push は行わない（実行者が実行）
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const ROOT = process.cwd()
// front にローカル導入した prettier を node 経由で呼ぶ（OS 非依存・cwd=ROOT 基準）
const PRETTIER_BIN = 'front/node_modules/prettier/bin/prettier.cjs'

const sh = (cmd) =>
  spawnSync(cmd, { cwd: ROOT, encoding: 'utf8', shell: true })

// git status --porcelain から未コミット変更パスを取り出す
function changedPaths() {
  const res = sh('git status --porcelain')
  return (res.stdout || '')
    .split('\n')
    .filter(Boolean)
    .map((l) => l.slice(3).trim())
    .map((p) => (p.includes(' -> ') ? p.split(' -> ')[1] : p)) // リネーム対応
    .map((p) => p.replace(/^"|"$/g, '')) // クォート除去
}

// front/src 配下の整形対象ファイル（未コミット分）
function formatTargets(paths) {
  return paths.filter((p) => /^front\/src\/.*\.(jsx?|css)$/.test(p))
}

// prettier --write。戻り値 changedCount は (unchanged) でない行数。
// prettier 未導入なら skipped=true。
function formatFiles(files) {
  if (files.length === 0) return { changedCount: 0 }
  if (!existsSync(PRETTIER_BIN)) return { changedCount: 0, skipped: true }
  const res = spawnSync(
    process.execPath,
    [PRETTIER_BIN, '--write', ...files],
    { cwd: ROOT, encoding: 'utf8' },
  )
  const changedCount = (res.stdout || '')
    .split('\n')
    .filter((l) => l.trim() && !l.includes('(unchanged)'))
    .length
  return { changedCount }
}

// npm --prefix front run build。ok と出力末尾を返す。
function buildFront() {
  const res = sh('npm --prefix front run build')
  const out = ((res.stdout || '') + '\n' + (res.stderr || '')).trim()
  const tail = out.split('\n').slice(-20).join('\n')
  return { ok: res.status === 0, tail }
}

let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (d) => { input += d })
process.stdin.on('end', () => {
  let data = {}
  try { data = JSON.parse(input || '{}') } catch { /* 壊れていても止めない */ }

  if (data.stop_hook_active) process.exit(0)

  const paths = changedPaths()
  const frontChanged = paths.some((p) => p.startsWith('front/'))
  if (!frontChanged) process.exit(0)

  const { changedCount } = formatFiles(formatTargets(paths))

  const build = buildFront()
  if (!build.ok) {
    process.stderr.write(
      [
        'front の build に失敗しました。以下を修正してください（push しないこと）:',
        '----',
        build.tail,
        '----',
      ].join('\n') + '\n',
    )
    process.exit(2)
  }

  if (changedCount > 0) {
    process.stderr.write(
      `prettier で ${changedCount} 件整形・build OK。` +
        '整形差分を含めて commit→push してください（push は自分で実行）。\n',
    )
    process.exit(2)
  }

  // build OK・整形差分なし → 静かに停止許可
  process.exit(0)
})
```

- [ ] **Step 2: 継続再停止で即終了することを確認（ループ防止）**

Run:
```powershell
'{"stop_hook_active":true}' | node ".claude/hooks/stop-check.mjs"; "exit=$LASTEXITCODE"
```
Expected: 出力なし、`exit=0`。

- [ ] **Step 3: 作業ツリーがクリーンなら無干渉で停止許可**

前提: 未コミット変更がない状態（`git status --porcelain` が空）。
Run:
```powershell
'{}' | node ".claude/hooks/stop-check.mjs"; "exit=$LASTEXITCODE"
```
Expected: 出力なし、`exit=0`。

- [ ] **Step 4: 整形差分ありで build OK のとき exit 2 で知らせる**

前提: `front/src` の任意ファイルをわざと非整形（例: 行末にセミコロンを足す等）にして保存し、まだ commit しない。
Run:
```powershell
'{}' | node ".claude/hooks/stop-check.mjs"; "exit=$LASTEXITCODE"
```
Expected: stderr に「prettier で N 件整形・build OK。…commit→push してください」、`exit=2`。
実行後 `git status` で当該ファイルが prettier により整形し直されていること（＝整形が効いた）を確認。確認後は `git checkout -- <file>` で元に戻す。

- [ ] **Step 5: build を壊すと exit 2 で差し戻す**

前提: `front/src` のいずれかに構文エラーを仕込む（例: `export default function` の括弧を欠く）。commit しない。
Run:
```powershell
'{}' | node ".claude/hooks/stop-check.mjs"; "exit=$LASTEXITCODE"
```
Expected: stderr に「front の build に失敗しました」＋ build エラー末尾、`exit=2`。
確認後は `git checkout -- <file>` で元に戻し、再度 Step 3 がクリーンに戻ることを確認。

- [ ] **Step 6: hook のコミット要否をユーザーに確認**

これまで `.claude/` は未コミット運用。hook 本体 `.claude/hooks/stop-check.mjs` を
リポジトリにコミットするか、ローカル運用のままにするかをユーザーに確認する。
- コミットする場合:
```powershell
git add .claude/hooks/stop-check.mjs
git commit -m "feat: Stopフックを自動整形+build検証に改修"
```
- ローカル運用のままにする場合: コミットしない（`.gitignore` に `.claude/` を追加する案も提示）。

---

## Self-Review

**1. Spec coverage（設計書の各項目 → タスク対応）:**
- 変更検知（git status --porcelain / front 絞り込み） → Task2 `changedPaths` / `frontChanged`。
- prettier 整形（front/src の js/jsx/css） → Task2 `formatTargets` / `formatFiles`、設定は Task1。
- build 検証（npm --prefix front run build） → Task2 `buildFront`。
- exit 規約（失敗=2 / 整形あり=2 / それ以外=0 / stop_hook_active=0） → Task2 本体フロー＋ Step2〜5 検証。
- commit/push は hook で行わない → コード上 commit/push 呼び出しなし、Step6 で明文化。
- prettier 未導入時スキップ → `formatFiles` の `skipped`。
- エラーハンドリング（JSON 壊れ・安全側） → try/catch、front 変更なしは exit 0。
- テスト観点（build 壊し / 整形差分 / クリーン / ループ防止） → Step2〜5。
- 「front 以外のみ変更時は build 不実行」 → `frontChanged` が false なら exit 0（docs/.claude だけの変更では build しない）。

**2. Placeholder scan:** TBD/TODO 無し。全ステップに実コード・実コマンド・期待出力を記載。

**3. Type consistency:** `changedPaths()` → `formatTargets(paths)` / `paths.some(...)`、`formatFiles()` は `{ changedCount, skipped }` を返し本体で参照、`buildFront()` は `{ ok, tail }` を返し本体で参照。整合。

備考: 自動テストフレームワークが無いため、本計画は TDD の「失敗するテスト」の代わりに、hook を直接起動する手動検証（Step2〜5）で各挙動を確認する。
