# 変更履歴 (CHANGELOG)

## 2026-10-20

### タスク優先度（高 / 中 / 低）機能
- 優先度機能の本体を実装（土台のみだった配線を完成）: `useTodos` の永続化、`PrioritySelector`、`TodoItem` のバッジ、`TodoList` の優先度順ソート
- タスク詳細モーダルから優先度をワンタップ変更（編集ボタンと左右2分割、再タップで無印、楽観的更新。`setPriority` は priority のみ更新し createdAt を変えない）

### 開発基盤: Stop フック（自動整形 + build 検証）
- `front` に prettier を導入（既存スタイル準拠: `semi:false`/`singleQuote`/`arrowParens:avoid`/`printWidth:100`）。導入時に `front/src` を一括整形してベースライン確立
- `.claude/hooks/stop-check.mjs` を改修: 停止時に未コミットの `front/` 変更を prettier 整形 → `npm run build` 検証。build 失敗／整形差分あり → `exit 2`、整形差分なしでOK／front変更なし／`stop_hook_active` → `exit 0`。commit/push は hook では行わない
- 設計書・実装計画を `docs/superpowers/` に追加

### 備考
- 上記は origin/main に反映済み（Vercel 本番デプロイ済み）。
- 本日、別の Claude Code セッションが同リポジトリで並行作業し一時的に履歴が混線したが、最終的に origin/main は本作業のクリーンな線形履歴に収束。
