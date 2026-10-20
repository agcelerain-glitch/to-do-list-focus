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

// git status --porcelain から未コミット変更パスを取り出す
function changedPaths() {
  const res = spawnSync('git', ['status', '--porcelain'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  return (res.stdout || '')
    .split('\n')
    .filter(Boolean)
    .map(l => l.slice(3).trim())
    .map(p => (p.includes(' -> ') ? p.split(' -> ')[1] : p)) // リネーム対応
    .map(p => p.replace(/^"|"$/g, '')) // クォート除去
}

// front/src 配下の整形対象ファイル（未コミット分）
function formatTargets(paths) {
  return paths.filter(p => /^front\/src\/.*\.(jsx?|css)$/.test(p))
}

// prettier --write を node 経由で実行。changedCount は (unchanged) でない行数。
// prettier 未導入なら skipped=true。
function formatFiles(files) {
  if (files.length === 0) return { changedCount: 0 }
  if (!existsSync(PRETTIER_BIN)) return { changedCount: 0, skipped: true }
  const res = spawnSync(process.execPath, [PRETTIER_BIN, '--write', ...files], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  const changedCount = (res.stdout || '')
    .split('\n')
    .filter(l => l.trim() && !l.includes('(unchanged)')).length
  return { changedCount }
}

// npm --prefix front run build。Windows の npm.cmd 対策で shell:true。
function buildFront() {
  const res = spawnSync('npm --prefix front run build', {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
  })
  const out = ((res.stdout || '') + '\n' + (res.stderr || '')).trim()
  const tail = out.split('\n').slice(-20).join('\n')
  return { ok: res.status === 0, tail }
}

let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', d => {
  input += d
})
process.stdin.on('end', () => {
  let data = {}
  try {
    data = JSON.parse(input || '{}')
  } catch {
    /* 入力が壊れていても止めない */
  }

  // 継続の結果の再停止 → 何もしない（ループ防止）
  if (data.stop_hook_active) process.exit(0)

  // 1. 未コミットの front 変更を検知
  const paths = changedPaths()
  if (!paths.some(p => p.startsWith('front/'))) process.exit(0)

  // 2. 整形（front/src の対象拡張子のみ）
  const { changedCount } = formatFiles(formatTargets(paths))

  // 3. build 検証
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

  // 4. 整形差分ありなら add 忘れ防止に知らせる。無ければ静かに停止許可。
  if (changedCount > 0) {
    process.stderr.write(
      `prettier で ${changedCount} 件整形・build OK。` +
        '整形差分を含めて commit→push してください（push は自分で実行）。\n',
    )
    process.exit(2)
  }

  process.exit(0)
})
