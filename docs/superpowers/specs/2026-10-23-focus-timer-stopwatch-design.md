# フォーカス計測機能（ストップウォッチ／タイマー）設計書

- 日付: 2026-10-23
- 対象アプリ: todo_list004（front / React + Vite + Firebase + PWA）

## 1. 概要・目的

フォーカスモード（目アイコンから開く画面）に、ストップウォッチ（カウントアップ）とタイマー（カウントダウン）を統合する。タスクの有無に関わらず「自然な時間計測ツール」として使え、かつ任意でタスクと連携できる。タイマー終了時はユーザーが選んだアラーム音で通知する。

## 2. スコープ / 非スコープ

### スコープ
- ストップウォッチ / タイマーの計測（開始・一時停止・再開・リセット）
- 壁時計ベースの計測（バックグラウンド・再読み込みに強い）
- localStorage による計測状態の永続と復元
- 任意のタスク連携（計測画面に対象タスク名を表示、完了操作が可能）
- タイマー終了通知：選択アラーム音 ＋ バイブ ＋ 画面表示
- アラーム音のユーザー選択（4種）＋ 試聴、マスターのミュート設定（設定ページ）
- フォーカスページからのミュート即時トグル
- 操作音（開始・リセット）
- 稼働中チップ（フォーカス閉時に計測中を示す）
- PWA：`/sounds/*.mp3` の runtime caching（オフライン対応）

### 非スコープ（YAGNI）
- 計測時間のタスクへの保存・累積（Firestore スキーマは変更しない）
- セッション履歴・集計・レポート
- ポモドーロの自動サイクル（作業/休憩の自動切替）
- アラーム音のユーザーアップロード

## 3. データモデル（localStorage のみ・Firestore 変更なし）

### 3.1 計測状態 `timerState`（キー: `timerState`、JSON）
```
{
  mode: 'stopwatch' | 'timer',
  status: 'idle' | 'running' | 'paused' | 'finished',
  startedAt: number | null,   // 現在の稼働セグメント開始時刻(ms, Date.now())
  accumulatedMs: number,       // 一時停止までに積み上がった経過(ms)
  durationMs: number | null,   // タイマー設定時間(ms)。stopwatch時は null
  taskId: string | null,       // 連携タスク(任意)
  taskTitle: string | null,    // 表示用にキャッシュしたタスク名
}
```
- 経過(stopwatch) = `accumulatedMs + (status==='running' ? Date.now() - startedAt : 0)`
- 残り(timer) = `durationMs - 経過`。`0` 以下で `finished`。
- 全ての状態変化で localStorage に保存。起動時に復元し、`running` のタイマーが既に 0 を過ぎていれば `finished` に補正する（復元直後にアラーム鳴動はしない。画面上は「終了」表示のみ）。

### 3.2 サウンド設定（AppContext 経由、既存 lang/colorMode と同じ永続パターン）
```
localStorage.timerAlarm     = 'timer_alarm_01' | 'timer_alarm_02' | 'timer_alarm_03' | 'timer_alarm_04'  // 既定: 'timer_alarm_01'
localStorage.soundMuted      = '0' | '1'   // 既定: '0'（ミュートOFF）
localStorage.vibrateEnabled  = '0' | '1'   // 既定: '1'（バイブON）
```

これら3値はすべて AppContext の単一状態として保持し、設定ページ・フォーカスページの双方のトグルは同じ状態を読み書きする（＝どちらで切り替えても即同期。robust な単一の真実源）。

## 4. 音声ファイル（`front/public/sounds/`）

| ファイル | 用途 | 区分 |
|---|---|---|
| `timer_alarm_01.mp3`（約7.8MB） | タイマー終了アラーム（選択肢「アラーム1」） | 選択可 |
| `timer_alarm_02.mp3`（約2.6MB） | 同「アラーム2」 | 選択可 |
| `timer_alarm_03.mp3`（約5.3MB） | 同「アラーム3」 | 選択可 |
| `timer_alarm_04.mp3`（約4.0MB） | 同「アラーム4」 | 選択可 |
| `stopwatch_button.mp3`（26KB） | ストップウォッチ開始音 | 固定 |
| `timer_button.mp3`（25KB） | タイマー開始音 | 固定 |
| `reset_01.mp3`（7KB） | リセット音 / ミュート解除時のフィードバック音 | 固定 |

アラームのラベルは中身が判別できないため「アラーム1〜4」とし、設定画面に試聴ボタン（▶）を付ける。

## 5. 音声仕様

### 5.1 自動再生制約の回避（解錠）
- タイマー「開始」ボタン押下（ユーザー操作）時に、選択中アラームの `Audio` オブジェクトを生成し一度 `play()` → 即 `pause()` + `currentTime=0` で解錠しておく。タイマー終了時（コールバック）に同インスタンスを本再生する。
- 試聴・操作音は常にユーザー操作起点なので制約なし。

### 5.2 再生ルール
音（`soundMuted==='1'` のときは鳴らさない。例外は設定画面の試聴＝7.3）／ バイブ（`vibrateEnabled==='1'` かつ `navigator.vibrate` 対応時のみ）。音とバイブは独立に制御する。

- タイマー `finished` 遷移時：選択アラームを再生（ループせず1回）＋ `navigator.vibrate?.([400,200,400])`＋ 画面アラート表示。
- ストップウォッチ開始：`stopwatch_button.mp3`
- タイマー開始：`timer_button.mp3`
- リセット：`reset_01.mp3`
- ミュート解除（`soundMuted` を `1→0`）：`reset_01.mp3` を鳴らす（「音が戻った」聴覚フィードバック）。ミュート有効化（`0→1`）時は無音。
- バイブ有効化（`vibrateEnabled` を `0→1`）：短い確認バイブ `navigator.vibrate?.(80)` を1回（「バイブが戻った」触覚フィードバック。ミュート解除音と対になる挙動）。無効化（`1→0`）時は何もしない。

### 5.3 共通ユーティリティ
- `playSound(file)` ヘルパ（`soundMuted` を参照、ミュート時は何もしない）を 1 箇所に実装。アラーム本再生／解錠だけは専用インスタンスを使う。

## 6. 状態管理（`useTimer` フック・新規 `front/src/hooks/useTimer.js`）

MainScreen で 1 回だけ生成し、FocusMode と稼働中チップへ渡す（単一の真実源）。

公開 API:
```
const {
  mode, status, taskTitle,
  elapsedMs, remainingMs,   // tick ごとに再計算された表示用の値
  start(mode, { durationMs, taskId, taskTitle }),  // 解錠＋開始音
  pause(), resume(),
  reset(),                  // reset音
  stopFinished(),           // finished を止めて idle に戻す
  completeLinkedTask(),     // taskId を complete→reset
  linkTask(todo), clearTask(),
} = useTimer({ onCompleteTask })
```
- 表示更新は `status==='running'` の間だけ 250ms 間隔の `setInterval`（実時間は常に `Date.now()` から算出するためズレない）。停止時はインターバルを張らない。
- `finished` 判定は tick 内で `remaining<=0` を検出 → `status='finished'` に遷移し通知（5.2）。
- `completeLinkedTask` は props 経由で受け取った `complete(id)`（既存 useTodos）を呼び、計測を `reset`。

## 7. UI 仕様

### 7.1 FocusMode 改修（`front/src/components/FocusMode.jsx`）
現在の「タスク選択専用」から「計測＋任意タスク連携」画面へ作り変える。

- 上部：モード切替セグメント **[ ストップウォッチ | タイマー ]**、右端にクイックトグル2つ — ミュート（🔔/🔕 `soundMuted`、5.2 のフィードバック音）とバイブ（📳/🚫 `vibrateEnabled`、5.2 のフィードバックバイブ）。どちらも AppContext の状態を直接読み書きし、設定ページと即同期する。
- 中央：大きな時間表示。`MM:SS`、1時間以上は `H:MM:SS`。タイマー時は残り時間、ストップウォッチ時は経過時間。
- 時間表示の下：**「タスクにひも付ける（任意）」**。未達タスク一覧から選択（既存の集中フローを統合）。連携中はタスク名を表示し解除も可能。
- タイマーの `idle` 時：プリセット chip **5 / 10 / 15 / 25 / 30 / 45 / 60 分**（選ぶと `durationMs` 設定）。
- 下部操作：`開始` →（稼働中は `一時停止` / `リセット`、停止中は `再開` / `リセット`）。`finished` 時はアラート表示＋`停止`。連携タスクありなら **「このタスクを完了」**。
- `×`（閉じる）で計測は継続（状態は useTimer が保持、稼働中チップが出る）。

### 7.2 稼働中チップ（`MainScreen` 内）
- `status` が `running | paused | finished` かつフォーカス閉時に、画面下部へ小さなピル（モードアイコン＋ライブ時間、`finished` 時は「終了」）を表示。タップでフォーカス再オープン。

### 7.3 設定ページ（`front/src/components/SettingsPanel.jsx`）に新セクション「サウンド」
- マスターのミュート切替（`soundMuted`、5.2 のフィードバック音）。
- バイブ切替（`vibrateEnabled`、5.2 のフィードバックバイブ）。iOS Web では `navigator.vibrate` 非対応のため実質 no-op になる旨を注記（`settings.sound.vibrateNote`）。
- アラーム音のラジオ選択「アラーム1〜4」。各行に試聴ボタン（▶、押下で該当 mp3 を再生。ミュート中でも試聴は鳴らす＝設定確認のため）。
- 言語・色覚設定セクションと同じ見た目に合わせる。

### 7.4 AppContext（`front/src/contexts/AppContext.jsx`）
- `timerAlarm` / `setTimerAlarm`、`soundMuted` / `setSoundMuted`、`vibrateEnabled` / `setVibrateEnabled` を追加（既存 lang/colorMode と同じ localStorage 永続パターン）。設定・フォーカス双方のトグルがこの状態を共有することで同期を保証する。

## 8. i18n（`front/src/i18n/translations.js`、ja/en/zh 全てに追加）
`timer` セクション（例）:
- `stopwatch`（ストップウォッチ）, `timer`（タイマー）
- `start / pause / resume / reset / stop`
- `linkTask`（タスクにひも付ける）, `clearTask`（解除）, `completeTask`（このタスクを完了）
- `finished`（時間です）
- `presetMin`（{n}分）
- `running`（計測中）, `done`（終了）

`settings.sound` セクション:
- `title`（サウンド）, `mute`（ミュート）, `vibrate`（バイブ）, `alarm`（アラーム音）
- `alarm1..alarm4`（アラーム1〜4）, `preview`（試聴）
- `vibrateNote`（※ iOS など一部環境ではバイブ非対応）

## 9. CSS（`front/src/index.css`）
- 既存 `.focus-*` に倣い `.timer-*`（モード切替、時間表示、プリセット chip、操作ボタン、finished アラート、ミュートトグル）を追加。
- 稼働中チップ `.timer-chip`。
- 設定の `.settings-*` に倣いサウンドセクションのラジオ＋試聴ボタン。

## 10. PWA（`front/vite.config.js`）
- `workbox.runtimeCaching` に追加:
```
{
  urlPattern: /\/sounds\/.*\.mp3$/i,
  handler: 'CacheFirst',
  options: {
    cacheName: 'sound-cache',
    expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
    cacheableResponse: { statuses: [0, 200] },
    rangeRequests: true,
  },
}
```
- `globPatterns` に mp3 は追加しない（大容量アラームをプリキャッシュで肥大化させない。初回再生時にランタイムキャッシュされ、以降オフライン可）。

## 11. エッジケース / エラー処理・プラットフォーム制約
- **システムのマナー/サイレントモード**：Web からは読み取り・上書き不可。挙動は OS 任せ（Android はメディア音量/DND に従う、iOS はミュートスイッチと Web 音声の関係が不安定）。アプリ内ミュートはそれとは独立した追加スイッチ。
- **バイブのプラットフォーム差**：`navigator.vibrate` は iOS Safari 非対応（Web ではバイブ不可）。Android でも DND により抑制されうる。`vibrateEnabled` が ON でも非対応環境では no-op。`?.` でスキップし例外にしない。
- **バックグラウンド/ロック中のアラーム**：壁時計で経過/残りは正確だが、0秒ちょうどでの鳴動は Web では保証されない（タブのスロットル／iOS ロック中は不可）。復帰時に `finished` 表示を出す（復元時に音は鳴らさない）。背面通知の補強は今回スコープ外（4択で「入れない」を選択）。
- mp3 読み込み失敗（オフライン初回など）：`play()` の reject を握りつぶし、バイブ＋画面表示は実行。
- 復元時に timer が既に 0 を過ぎている：`finished` 表示のみ（音は鳴らさない）。
- タイマー 0 分や未設定で開始しようとした場合：開始ボタンを無効化（`durationMs>0` 必須）。
- 連携タスクが別画面で削除/完了された場合：`todos` に存在しなければ連携表示を外す（タスク名キャッシュは残すが完了ボタンは無効）。
- ストップウォッチの上限：`H:MM:SS` 表示で実用上問題なし（上限制御は設けない）。

## 12. 検証方法
本プロジェクトにテストハーネスは無いため、検証は以下で行う:
- `npm run build`（front）で型・ビルドエラーが無いこと。
- 手動確認：ストップウォッチ/タイマーの開始・一時停止・再開・リセット、バックグラウンド（画面を閉じて再開）、再読み込み後の復元、タイマー終了の音/バイブ/表示、アラーム選択の試聴と反映、ミュートの両画面同期と解除フィードバック音、タスク連携と完了、稼働中チップ。

## 13. 変更ファイル一覧
- 新規: `front/src/hooks/useTimer.js`
- 新規: `front/src/components/TimerChip.jsx`（稼働中チップ。MainScreen 内でも可だが分離）
- 変更: `front/src/components/FocusMode.jsx`（計測画面へ改修）
- 変更: `front/src/components/MainScreen.jsx`（useTimer 生成・FocusMode/チップへ受け渡し）
- 変更: `front/src/components/SettingsPanel.jsx`（サウンド設定セクション）
- 変更: `front/src/contexts/AppContext.jsx`（timerAlarm / soundMuted）
- 変更: `front/src/i18n/translations.js`（timer / settings.sound）
- 変更: `front/src/index.css`（timer / chip / sound settings スタイル）
- 変更: `front/vite.config.js`（sounds の runtimeCaching）
- 新規（任意）: `front/src/lib/sound.js`（playSound ヘルパ）
