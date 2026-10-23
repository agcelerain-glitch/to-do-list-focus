# フォーカス計測機能（ストップウォッチ／タイマー）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** フォーカスモードにストップウォッチ／タイマーを統合し、タスク非依存の計測＋任意タスク連携＋ユーザー選択アラーム音を実現する。

**Architecture:** 計測状態は `useTimer` フックが壁時計（`Date.now()`）＋localStorageで管理し、MainScreen で1回だけ生成してFocusModeと稼働中チップへ渡す（単一の真実源）。音・バイブ・ミュート/バイブ設定は `lib/sound.js` と AppContext（localStorage永続）で扱う。Firestoreスキーマは変更しない（計測時間は保存しない）。

**Tech Stack:** React 18 + Vite 5 + Firebase（既存）/ vite-plugin-pwa（Workbox）/ Font Awesome / HTMLAudioElement + navigator.vibrate。

## Global Constraints

- 計測時間はFirestoreに保存しない。todoドキュメントのスキーマ変更なし。
- 壁時計ベース：経過/残りは常に `Date.now()` から算出（バックグラウンドでズレない）。
- 音は `soundMuted==='1'`（context上は boolean true）のとき鳴らさない。例外は設定画面の試聴のみ。
- バイブは `vibrateEnabled`（既定ON）かつ `navigator.vibrate` 対応時のみ。非対応環境はno-op（例外を投げない）。
- localStorageキー: `timerState`（JSON）, `timerAlarm`（既定 `'timer_alarm_01'`）, `soundMuted`（`'0'|'1'`、既定 `'0'`）, `vibrateEnabled`（`'0'|'1'`、既定 `'1'`）。
- アラーム音ファイル: `/sounds/timer_alarm_0{1..4}.mp3`。操作音: `/sounds/stopwatch_button.mp3`, `/sounds/timer_button.mp3`, `/sounds/reset_01.mp3`。
- i18nは ja / en / zh の3言語すべてに追加する。
- 検証はテストハーネス未導入のため `cd front && npm run build`（成功）＋手動確認とする。
- プリキャッシュ(globPatterns)にmp3を追加しない。mp3はruntimeCaching(CacheFirst)でオフライン対応。
- コミットは日本語メッセージ、末尾に `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。

> 注: 全コマンドは `H:\_business_system\todo_list004\front` を基準。`npm run build` もfront配下で実行。

---

## ファイル構成

- 新規 `front/src/lib/sound.js` — 音/バイブのユーティリティ（playSound / createAlarm / vibrate / toggleMute / toggleVibrate）。
- 新規 `front/src/hooks/useTimer.js` — 計測ステートマシン＋localStorage＋tick。`formatDuration` もexport。
- 新規 `front/src/components/TimerChip.jsx` — 稼働中チップ。
- 変更 `front/src/contexts/AppContext.jsx` — timerAlarm / soundMuted / vibrateEnabled を追加。
- 変更 `front/src/i18n/translations.js` — `timer` と `settings.sound` を3言語に追加。
- 変更 `front/src/components/SettingsPanel.jsx` — 「サウンド」セクション追加。
- 変更 `front/src/components/FocusMode.jsx` — 計測画面へ全面改修。
- 変更 `front/src/components/MainScreen.jsx` — useTimer生成・FocusMode/TimerChip配線。
- 変更 `front/src/index.css` — `.timer-*` / `.timer-chip` / サウンド設定のスタイル。
- 変更 `front/vite.config.js` — `/sounds/*.mp3` のruntimeCaching。

---

## Task 1: 設定状態（AppContext）と文言（i18n）の土台

**Files:**
- Modify: `front/src/contexts/AppContext.jsx`
- Modify: `front/src/i18n/translations.js`

**Interfaces:**
- Produces（AppContext value に追加）:
  - `timerAlarm: string`（`'timer_alarm_01'..'_04'`）, `setTimerAlarm(v: string): void`
  - `soundMuted: boolean`, `setSoundMuted(v: boolean): void`
  - `vibrateEnabled: boolean`, `setVibrateEnabled(v: boolean): void`
- Produces（翻訳キー）: `t.timer.*`, `t.settings.sound.*`（下記Step参照）

- [ ] **Step 1: AppContext に state と setter を追加**

`front/src/contexts/AppContext.jsx` の `const [colorMode, setColorModeState] = ...` ブロック直後（`const setLang = ...` の前）に以下を追加:

```jsx
  const [timerAlarm, setTimerAlarmState] = useState(() => localStorage.getItem('timerAlarm') || 'timer_alarm_01')
  const [soundMuted, setSoundMutedState] = useState(() => localStorage.getItem('soundMuted') === '1')
  const [vibrateEnabled, setVibrateEnabledState] = useState(() => localStorage.getItem('vibrateEnabled') !== '0')

  const setTimerAlarm = v => {
    setTimerAlarmState(v)
    localStorage.setItem('timerAlarm', v)
  }

  const setSoundMuted = v => {
    setSoundMutedState(v)
    localStorage.setItem('soundMuted', v ? '1' : '0')
  }

  const setVibrateEnabled = v => {
    setVibrateEnabledState(v)
    localStorage.setItem('vibrateEnabled', v ? '1' : '0')
  }
```

- [ ] **Step 2: Provider の value に追加**

同ファイルの `value={{ lang, setLang, t, colorMode, setColorMode }}` を次に置換:

```jsx
    <AppContext.Provider
      value={{
        lang,
        setLang,
        t,
        colorMode,
        setColorMode,
        timerAlarm,
        setTimerAlarm,
        soundMuted,
        setSoundMuted,
        vibrateEnabled,
        setVibrateEnabled,
      }}
    >
```

- [ ] **Step 3: 翻訳キーを3言語に追加（ja）**

`front/src/i18n/translations.js` の `ja` の `focus: { ... },` ブロックの直後に以下を追加:

```js
    timer: {
      stopwatch: 'ストップウォッチ',
      timer: 'タイマー',
      start: '開始',
      pause: '一時停止',
      resume: '再開',
      reset: 'リセット',
      stop: '停止',
      linkTask: 'タスクにひも付ける',
      clearTask: '解除',
      completeTask: 'このタスクを完了',
      pickTask: 'タスクを選択',
      finished: '時間です',
      running: '計測中',
      done: '終了',
      presetMin: '{n}分',
    },
```

- [ ] **Step 4: ja の settings に sound セクションを追加**

`ja` の `settings: {` 直下（`title: '設定',` の次の行）に追加:

```js
      sound: {
        title: 'サウンド',
        mute: 'ミュート',
        vibrate: 'バイブ',
        vibrateNote: '※ iOSなど一部環境ではバイブに対応していません',
        alarm: 'アラーム音',
        preview: '試聴',
        alarm1: 'アラーム1',
        alarm2: 'アラーム2',
        alarm3: 'アラーム3',
        alarm4: 'アラーム4',
      },
```

- [ ] **Step 5: 翻訳キーを en に追加**

`en` の `focus: { ... },` ブロック直後に追加:

```js
    timer: {
      stopwatch: 'Stopwatch',
      timer: 'Timer',
      start: 'Start',
      pause: 'Pause',
      resume: 'Resume',
      reset: 'Reset',
      stop: 'Stop',
      linkTask: 'Link a task',
      clearTask: 'Unlink',
      completeTask: 'Complete this task',
      pickTask: 'Choose a task',
      finished: "Time's up",
      running: 'Running',
      done: 'Done',
      presetMin: '{n} min',
    },
```

`en` の `settings: {` 直下（`title: 'Settings',` の次）に追加:

```js
      sound: {
        title: 'Sound',
        mute: 'Mute',
        vibrate: 'Vibration',
        vibrateNote: '* Vibration is not supported on some platforms (e.g. iOS)',
        alarm: 'Alarm sound',
        preview: 'Preview',
        alarm1: 'Alarm 1',
        alarm2: 'Alarm 2',
        alarm3: 'Alarm 3',
        alarm4: 'Alarm 4',
      },
```

- [ ] **Step 6: 翻訳キーを zh に追加**

`zh` の `focus: { ... },` ブロック直後に追加:

```js
    timer: {
      stopwatch: '秒表',
      timer: '计时器',
      start: '开始',
      pause: '暂停',
      resume: '继续',
      reset: '重置',
      stop: '停止',
      linkTask: '关联任务',
      clearTask: '取消关联',
      completeTask: '完成此任务',
      pickTask: '选择任务',
      finished: '时间到',
      running: '计时中',
      done: '结束',
      presetMin: '{n}分钟',
    },
```

`zh` の `settings: {` 直下（`title: '设置',` の次）に追加:

```js
      sound: {
        title: '声音',
        mute: '静音',
        vibrate: '振动',
        vibrateNote: '※ iOS 等部分环境不支持振动',
        alarm: '闹铃声',
        preview: '试听',
        alarm1: '闹铃1',
        alarm2: '闹铃2',
        alarm3: '闹铃3',
        alarm4: '闹铃4',
      },
```

- [ ] **Step 7: ビルド確認**

Run: `npm run build`
Expected: `✓ built in ...`（エラーなし）

- [ ] **Step 8: コミット**

```bash
git add front/src/contexts/AppContext.jsx front/src/i18n/translations.js
git commit -m "feat: サウンド設定(AppContext)と計測機能の文言を追加

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: サウンドユーティリティ `lib/sound.js`

**Files:**
- Create: `front/src/lib/sound.js`

**Interfaces:**
- Produces:
  - `playSound(name: string, opts?: { muted?: boolean, force?: boolean }): void`
  - `createAlarm(name: string): { unlock(): void, play(): void, stop(): void }`
  - `vibrate(pattern: number | number[], opts?: { enabled?: boolean }): void`
  - `toggleMute(soundMuted: boolean, setSoundMuted: (v: boolean) => void): void`
  - `toggleVibrate(vibrateEnabled: boolean, setVibrateEnabled: (v: boolean) => void): void`

- [ ] **Step 1: ファイルを作成**

`front/src/lib/sound.js`:

```js
// 音声・バイブのユーティリティ。mp3 は public/sounds/ に配置（ビルド後は /sounds/）。
const BASE = '/sounds'

// 操作音・試聴用の単発再生。muted かつ force でなければ鳴らさない。再生失敗は握りつぶす。
export function playSound(name, { muted = false, force = false } = {}) {
  if (muted && !force) return
  try {
    const audio = new Audio(`${BASE}/${name}.mp3`)
    const p = audio.play()
    if (p && typeof p.catch === 'function') p.catch(() => {})
  } catch {
    /* noop */
  }
}

// アラーム用。開始(ユーザー操作)時に unlock() で自動再生制約を解除し、終了時に play()。
// unlock は volume=0 で一瞬だけ再生→停止するので音は鳴らない（iOS の解錠対策）。
export function createAlarm(name) {
  const src = `${BASE}/${name}.mp3`
  let audio = null
  return {
    unlock() {
      try {
        audio = new Audio(src)
        audio.volume = 0
        const p = audio.play()
        if (p && typeof p.then === 'function') {
          p.then(() => {
            audio.pause()
            audio.currentTime = 0
            audio.volume = 1
          }).catch(() => {})
        }
      } catch {
        audio = null
      }
    },
    play() {
      try {
        if (!audio) audio = new Audio(src)
        audio.volume = 1
        audio.currentTime = 0
        const p = audio.play()
        if (p && typeof p.catch === 'function') p.catch(() => {})
      } catch {
        /* noop */
      }
    },
    stop() {
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    },
  }
}

// バイブ。enabled かつ navigator.vibrate 対応時のみ。
export function vibrate(pattern, { enabled = true } = {}) {
  if (!enabled) return
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern)
    } catch {
      /* noop */
    }
  }
}

// ミュート切替。解除(=音が戻る)時のみ reset 音でフィードバック。設定・フォーカス両画面で共用。
export function toggleMute(soundMuted, setSoundMuted) {
  const next = !soundMuted
  setSoundMuted(next)
  if (!next) playSound('reset_01', { force: true })
}

// バイブ切替。有効化時のみ短い確認バイブ。ミュート解除音と対になる触覚フィードバック。
export function toggleVibrate(vibrateEnabled, setVibrateEnabled) {
  const next = !vibrateEnabled
  setVibrateEnabled(next)
  if (next) vibrate(80, { enabled: true })
}
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: `✓ built`（構文エラーなし）

- [ ] **Step 3: コミット**

```bash
git add front/src/lib/sound.js
git commit -m "feat: 音声・バイブのユーティリティ(lib/sound.js)を追加

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: PWA — `/sounds/*.mp3` の runtimeCaching

**Files:**
- Modify: `front/vite.config.js`

**Interfaces:**
- Produces: Service Worker に `sound-cache`（CacheFirst）ルール。

- [ ] **Step 1: runtimeCaching に sounds ルールを追加**

`front/vite.config.js` の `runtimeCaching: [` の最初の要素として以下を先頭に挿入（既存のFont Awesomeルールの前）:

```js
          {
            // ローカル音声(/sounds/*.mp3) は初回再生時にキャッシュし以降オフライン可
            urlPattern: /\/sounds\/.*\.mp3$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sound-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
```

（`globPatterns` は変更しない＝mp3はプリキャッシュしない）

- [ ] **Step 2: ビルドして SW に反映されたか確認**

Run: `npm run build`
Expected: `✓ built` ＋ `files generated dist/sw.js`

Run（生成物確認）: `node -e "const s=require('fs').readFileSync('dist/sw.js','utf8'); console.log(s.includes('sound-cache') ? 'OK sound-cache present' : 'MISSING')"`
Expected: `OK sound-cache present`

- [ ] **Step 3: コミット**

```bash
git add front/vite.config.js
git commit -m "feat: /sounds/*.mp3 のPWAランタイムキャッシュを追加

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: 計測フック `hooks/useTimer.js`

**Files:**
- Create: `front/src/hooks/useTimer.js`

**Interfaces:**
- Consumes: `useAppContext()` の `soundMuted, vibrateEnabled, timerAlarm`、`lib/sound.js` の `playSound, createAlarm, vibrate`。
- Produces（フック戻り値）:
  - 値: `mode, status, taskId, taskTitle, durationMs, elapsedMs, remainingMs`
  - 関数: `start(mode, { durationMs?, taskId?, taskTitle? })`, `pause()`, `resume()`, `reset()`, `stopFinished()`, `linkTask(todo)`, `clearTask()`, `completeLinkedTask()`, `setMode(mode)`
  - 追加export: `formatDuration(ms: number): string`（`MM:SS` / 1時間以上は `H:MM:SS`）

- [ ] **Step 1: ファイルを作成**

`front/src/hooks/useTimer.js`:

```js
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppContext } from '../contexts/AppContext'
import { playSound, createAlarm, vibrate } from '../lib/sound'

const STORAGE_KEY = 'timerState'

const initialState = {
  mode: 'stopwatch', // 'stopwatch' | 'timer'
  status: 'idle', // 'idle' | 'running' | 'paused' | 'finished'
  startedAt: null, // 現セグメント開始時刻(ms)
  accumulatedMs: 0, // 一時停止までの累積
  durationMs: null, // タイマー設定時間
  taskId: null,
  taskTitle: null,
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    return { ...initialState, ...JSON.parse(raw) }
  } catch {
    return initialState
  }
}

// 経過ms = 累積 + (running中なら now - startedAt)
function elapsedOf(s, now) {
  return s.accumulatedMs + (s.status === 'running' && s.startedAt ? now - s.startedAt : 0)
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function useTimer({ onCompleteTask } = {}) {
  const { soundMuted, vibrateEnabled, timerAlarm } = useAppContext()
  const [state, setState] = useState(load)
  const [now, setNow] = useState(() => Date.now())
  const alarmRef = useRef(null)

  // tick コールバックから最新設定を参照するための ref
  const mutedRef = useRef(soundMuted)
  const vibRef = useRef(vibrateEnabled)
  useEffect(() => {
    mutedRef.current = soundMuted
  }, [soundMuted])
  useEffect(() => {
    vibRef.current = vibrateEnabled
  }, [vibrateEnabled])

  // 永続化
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* noop */
    }
  }, [state])

  // 起動時の復元補正: running のタイマーが既に終了していれば finished に（音は鳴らさない）
  useEffect(() => {
    setState(s => {
      if (s.status === 'running' && s.mode === 'timer' && s.durationMs != null) {
        if (elapsedOf(s, Date.now()) >= s.durationMs) {
          return { ...s, status: 'finished', accumulatedMs: s.durationMs, startedAt: null }
        }
      }
      return s
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // tick（running 中のみ 250ms）
  useEffect(() => {
    if (state.status !== 'running') return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [state.status])

  // finished 検出（timer, running 中に残り<=0）→ 通知
  useEffect(() => {
    if (state.status !== 'running' || state.mode !== 'timer' || state.durationMs == null) return
    if (elapsedOf(state, now) >= state.durationMs) {
      setState(s => ({ ...s, status: 'finished', accumulatedMs: s.durationMs, startedAt: null }))
      if (!mutedRef.current && alarmRef.current) alarmRef.current.play()
      vibrate([400, 200, 400], { enabled: vibRef.current })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, state.status, state.mode, state.durationMs])

  const start = useCallback(
    (mode, { durationMs = null, taskId = null, taskTitle = null } = {}) => {
      if (mode === 'timer') {
        if (!durationMs || durationMs <= 0) return
        alarmRef.current = createAlarm(timerAlarm)
        alarmRef.current.unlock()
        playSound('timer_button', { muted: soundMuted })
      } else {
        playSound('stopwatch_button', { muted: soundMuted })
      }
      setState({
        mode,
        status: 'running',
        startedAt: Date.now(),
        accumulatedMs: 0,
        durationMs: mode === 'timer' ? durationMs : null,
        taskId,
        taskTitle,
      })
      setNow(Date.now())
    },
    [timerAlarm, soundMuted],
  )

  const pause = useCallback(() => {
    setState(s =>
      s.status === 'running'
        ? { ...s, status: 'paused', accumulatedMs: elapsedOf(s, Date.now()), startedAt: null }
        : s,
    )
  }, [])

  const resume = useCallback(() => {
    setState(s => (s.status === 'paused' ? { ...s, status: 'running', startedAt: Date.now() } : s))
    setNow(Date.now())
  }, [])

  const reset = useCallback(() => {
    if (alarmRef.current) alarmRef.current.stop()
    playSound('reset_01', { muted: soundMuted })
    setState(s => ({ ...initialState, mode: s.mode }))
  }, [soundMuted])

  const stopFinished = useCallback(() => {
    if (alarmRef.current) alarmRef.current.stop()
    setState(s => ({ ...initialState, mode: s.mode }))
  }, [])

  const linkTask = useCallback(todo => {
    setState(s => ({ ...s, taskId: todo.id, taskTitle: todo.title }))
  }, [])

  const clearTask = useCallback(() => {
    setState(s => ({ ...s, taskId: null, taskTitle: null }))
  }, [])

  const completeLinkedTask = useCallback(async () => {
    const id = state.taskId
    if (!id) return
    if (alarmRef.current) alarmRef.current.stop()
    if (onCompleteTask) await onCompleteTask(id)
    setState(s => ({ ...initialState, mode: s.mode }))
  }, [state.taskId, onCompleteTask])

  const setMode = useCallback(mode => {
    setState(s => (s.status === 'idle' ? { ...s, mode } : s))
  }, [])

  const elapsedMs = elapsedOf(state, now)
  const remainingMs =
    state.mode === 'timer' && state.durationMs != null
      ? Math.max(0, state.durationMs - elapsedMs)
      : 0

  return {
    mode: state.mode,
    status: state.status,
    taskId: state.taskId,
    taskTitle: state.taskTitle,
    durationMs: state.durationMs,
    elapsedMs,
    remainingMs,
    start,
    pause,
    resume,
    reset,
    stopFinished,
    linkTask,
    clearTask,
    completeLinkedTask,
    setMode,
  }
}
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: `✓ built`（未使用でもtree-shakeで通る。構文/import エラーなし）

- [ ] **Step 3: コミット**

```bash
git add front/src/hooks/useTimer.js
git commit -m "feat: 計測フック useTimer を追加(壁時計+localStorage)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: 設定ページに「サウンド」セクション

**Files:**
- Modify: `front/src/components/SettingsPanel.jsx`
- Modify: `front/src/index.css`

**Interfaces:**
- Consumes: `useAppContext()`（`timerAlarm,setTimerAlarm,soundMuted,setSoundMuted,vibrateEnabled,setVibrateEnabled`）、`lib/sound.js`（`playSound, toggleMute, toggleVibrate`）。

- [ ] **Step 1: import と定数を追加**

`front/src/components/SettingsPanel.jsx` 冒頭の `import { useAppContext } ...` の下に追加:

```jsx
import { playSound, toggleMute, toggleVibrate } from '../lib/sound'
```

同ファイルの `COLOR_MODES` 定数の下に追加:

```jsx
const ALARMS = ['timer_alarm_01', 'timer_alarm_02', 'timer_alarm_03', 'timer_alarm_04']
```

- [ ] **Step 2: context から値を取得**

`const { t, lang, setLang, colorMode, setColorMode } = useAppContext()` を次に置換:

```jsx
  const {
    t,
    lang,
    setLang,
    colorMode,
    setColorMode,
    timerAlarm,
    setTimerAlarm,
    soundMuted,
    setSoundMuted,
    vibrateEnabled,
    setVibrateEnabled,
  } = useAppContext()
```

- [ ] **Step 3: サウンドセクションのJSXを追加**

`{/* ── Language ── */}` の直前に以下を挿入:

```jsx
          {/* ── Sound ── */}
          <div className="settings-section">
            <div className="settings-section-title">
              <i className="fa-solid fa-volume-high" />
              {s.sound.title}
            </div>

            <div className="sound-toggle-row">
              <span>{s.sound.mute}</span>
              <button
                className={`sound-switch${soundMuted ? ' on' : ''}`}
                onClick={() => toggleMute(soundMuted, setSoundMuted)}
                role="switch"
                aria-checked={soundMuted}
                aria-label={s.sound.mute}
              >
                <span className="sound-switch-knob" />
              </button>
            </div>

            <div className="sound-toggle-row">
              <span>{s.sound.vibrate}</span>
              <button
                className={`sound-switch${vibrateEnabled ? ' on' : ''}`}
                onClick={() => toggleVibrate(vibrateEnabled, setVibrateEnabled)}
                role="switch"
                aria-checked={vibrateEnabled}
                aria-label={s.sound.vibrate}
              >
                <span className="sound-switch-knob" />
              </button>
            </div>
            <p className="settings-note">{s.sound.vibrateNote}</p>

            <label className="settings-label">{s.sound.alarm}</label>
            <div className="sound-alarm-list">
              {ALARMS.map((key, i) => (
                <div
                  key={key}
                  className={`sound-alarm-row${timerAlarm === key ? ' active' : ''}`}
                >
                  <button className="sound-alarm-select" onClick={() => setTimerAlarm(key)}>
                    <span className={`sound-radio${timerAlarm === key ? ' on' : ''}`} />
                    {s.sound[`alarm${i + 1}`]}
                  </button>
                  <button
                    className="sound-preview-btn"
                    onClick={() => playSound(key, { force: true })}
                    aria-label={s.sound.preview}
                  >
                    <i className="fa-solid fa-play" />
                  </button>
                </div>
              ))}
            </div>
          </div>

```

- [ ] **Step 4: CSS を追加**

`front/src/index.css` の末尾に追加:

```css
/* ─── Sound settings ─── */
.sound-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 2px;
  font-size: 14px;
  color: var(--text);
}
.sound-switch {
  width: 46px;
  height: 28px;
  border-radius: 999px;
  background: var(--border);
  border: none;
  position: relative;
  transition: background 0.15s;
  cursor: pointer;
}
.sound-switch.on {
  background: #3b82f6;
}
.sound-switch-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s;
}
.sound-switch.on .sound-switch-knob {
  transform: translateX(18px);
}
.sound-alarm-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}
.sound-alarm-row {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 4px 8px 4px 4px;
  background: var(--surface);
}
.sound-alarm-row.active {
  border-color: #3b82f6;
}
.sound-alarm-select {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: none;
  border: none;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.sound-radio {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--border);
  flex-shrink: 0;
}
.sound-radio.on {
  border-color: #3b82f6;
  background:
    radial-gradient(circle at center, #3b82f6 0 5px, transparent 6px);
}
.sound-preview-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: #3b82f6;
  cursor: pointer;
}
```

- [ ] **Step 5: ビルド確認**

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 6: 手動確認**

Run: `npm run dev`（別ターミナル）し、ブラウザで設定（歯車）を開く。
Expected:
- 「サウンド」セクションが表示される。
- ミュートをON→OFF（OFF＝音が戻る）に切り替えると `reset_01` が鳴る。OFF→ON時は無音。
- バイブをOFF→ONにすると（対応端末で）短く振動。
- アラーム1〜4の▶で各音が鳴る（ミュート中でも試聴は鳴る）。
- ラジオ選択が保持される（リロード後も選択維持）。

- [ ] **Step 7: コミット**

```bash
git add front/src/components/SettingsPanel.jsx front/src/index.css
git commit -m "feat: 設定ページにサウンド(ミュート/バイブ/アラーム選択)を追加

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: FocusMode を計測画面へ改修 ＋ MainScreen 配線

**Files:**
- Modify: `front/src/components/FocusMode.jsx`（全面改修）
- Modify: `front/src/components/MainScreen.jsx`
- Modify: `front/src/index.css`

**Interfaces:**
- Consumes: `timer`（Task4 の `useTimer` 戻り値）, `todos`, `onClose`, `useAppContext()`, `lib/sound.js` の `toggleMute, toggleVibrate`, `useTimer` の `formatDuration`。
- Produces: MainScreen が `useTimer({ onCompleteTask: complete })` を保持し `timer` を FocusMode/TimerChip へ渡す。

- [ ] **Step 1: FocusMode.jsx を全面置換**

`front/src/components/FocusMode.jsx` の全内容を次に置換:

```jsx
import { useState } from 'react'
import { useAppContext } from '../contexts/AppContext'
import { toggleMute, toggleVibrate } from '../lib/sound'
import { formatDuration } from '../hooks/useTimer'

const PRESETS = [5, 10, 15, 25, 30, 45, 60] // 分

export default function FocusMode({ timer, todos, onClose }) {
  const { t, soundMuted, setSoundMuted, vibrateEnabled, setVibrateEnabled } = useAppContext()
  const tm = t.timer
  const [picking, setPicking] = useState(false)
  const [presetMin, setPresetMin] = useState(25)

  const pending = todos.filter(todo => !todo.completed)
  const isTimer = timer.mode === 'timer'
  const idle = timer.status === 'idle'

  // 表示値: タイマーidleはプリセット、以降は残り/経過
  const displayMs = isTimer ? (idle ? presetMin * 60 * 1000 : timer.remainingMs) : timer.elapsedMs

  const handleStart = () => {
    if (isTimer) {
      timer.start('timer', {
        durationMs: presetMin * 60 * 1000,
        taskId: timer.taskId,
        taskTitle: timer.taskTitle,
      })
    } else {
      timer.start('stopwatch', { taskId: timer.taskId, taskTitle: timer.taskTitle })
    }
  }

  return (
    <div className="focus-overlay">
      <div className="timer-screen">
        {/* ヘッダー: 閉じる + クイックトグル */}
        <div className="timer-header">
          <button className="focus-close-btn" onClick={onClose} aria-label="閉じる">
            <i className="fa-solid fa-xmark" />
          </button>
          <div className="timer-quick-toggles">
            <button
              className={`timer-quick-btn${soundMuted ? ' off' : ''}`}
              onClick={() => toggleMute(soundMuted, setSoundMuted)}
              aria-label={t.settings.sound.mute}
            >
              <i className={`fa-solid ${soundMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`} />
            </button>
            <button
              className={`timer-quick-btn${vibrateEnabled ? '' : ' off'}`}
              onClick={() => toggleVibrate(vibrateEnabled, setVibrateEnabled)}
              aria-label={t.settings.sound.vibrate}
            >
              <i className="fa-solid fa-mobile-screen-button" />
            </button>
          </div>
        </div>

        {/* モード切替（idle時のみ変更可） */}
        <div className="timer-mode-switch">
          <button
            className={`timer-mode-btn${!isTimer ? ' active' : ''}`}
            onClick={() => timer.setMode('stopwatch')}
            disabled={!idle}
          >
            <i className="fa-solid fa-stopwatch" /> {tm.stopwatch}
          </button>
          <button
            className={`timer-mode-btn${isTimer ? ' active' : ''}`}
            onClick={() => timer.setMode('timer')}
            disabled={!idle}
          >
            <i className="fa-solid fa-hourglass-half" /> {tm.timer}
          </button>
        </div>

        {/* 時間表示 */}
        <div className={`timer-display${timer.status === 'finished' ? ' finished' : ''}`}>
          {formatDuration(displayMs)}
        </div>
        {timer.status === 'finished' && <div className="timer-finished-label">{tm.finished}</div>}

        {/* タイマーidle時: プリセット */}
        {isTimer && idle && (
          <div className="timer-presets">
            {PRESETS.map(min => (
              <button
                key={min}
                className={`timer-preset-chip${presetMin === min ? ' active' : ''}`}
                onClick={() => setPresetMin(min)}
              >
                {tm.presetMin.replace('{n}', min)}
              </button>
            ))}
          </div>
        )}

        {/* タスク連携 */}
        <div className="timer-task-area">
          {timer.taskTitle ? (
            <div className="timer-task-linked">
              <i className="fa-solid fa-link" />
              <span className="timer-task-name">{timer.taskTitle}</span>
              <button className="timer-task-clear" onClick={timer.clearTask}>
                {tm.clearTask}
              </button>
            </div>
          ) : (
            <button className="timer-task-pick" onClick={() => setPicking(true)}>
              <i className="fa-solid fa-plus" /> {tm.linkTask}
            </button>
          )}
        </div>

        {/* 操作 */}
        <div className="timer-controls">
          {idle && (
            <button className="timer-btn primary" onClick={handleStart}>
              <i className="fa-solid fa-play" /> {tm.start}
            </button>
          )}
          {timer.status === 'running' && (
            <>
              <button className="timer-btn" onClick={timer.pause}>
                <i className="fa-solid fa-pause" /> {tm.pause}
              </button>
              <button className="timer-btn ghost" onClick={timer.reset}>
                <i className="fa-solid fa-rotate-left" /> {tm.reset}
              </button>
            </>
          )}
          {timer.status === 'paused' && (
            <>
              <button className="timer-btn primary" onClick={timer.resume}>
                <i className="fa-solid fa-play" /> {tm.resume}
              </button>
              <button className="timer-btn ghost" onClick={timer.reset}>
                <i className="fa-solid fa-rotate-left" /> {tm.reset}
              </button>
            </>
          )}
          {timer.status === 'finished' && (
            <button className="timer-btn primary" onClick={timer.stopFinished}>
              <i className="fa-solid fa-stop" /> {tm.stop}
            </button>
          )}
        </div>

        {/* タスク完了（連携あり & idle以外） */}
        {timer.taskId && !idle && (
          <button className="timer-complete-btn" onClick={timer.completeLinkedTask}>
            <i className="fa-solid fa-check" /> {tm.completeTask}
          </button>
        )}

        {/* タスク選択オーバーレイ */}
        {picking && (
          <div className="timer-pick-overlay" onClick={() => setPicking(false)}>
            <div className="timer-pick-sheet" onClick={e => e.stopPropagation()}>
              <div className="timer-pick-title">{tm.pickTask}</div>
              {pending.length === 0 ? (
                <div className="focus-empty">{t.focus.noTask}</div>
              ) : (
                pending.map(todo => (
                  <button
                    key={todo.id}
                    className="timer-pick-item"
                    onClick={() => {
                      timer.linkTask(todo)
                      setPicking(false)
                    }}
                  >
                    {todo.title}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: MainScreen に useTimer/TimerChip を配線**

`front/src/components/MainScreen.jsx` の import 群（`import { useAppContext } ...` の下）に追加:

```jsx
import { useTimer } from '../hooks/useTimer'
import TimerChip from './TimerChip'
```

`const { todos, add, complete, revive, update, setPriority, remove, removeCompleted } = useTodos(...)` の直後に追加:

```jsx
  const timer = useTimer({ onCompleteTask: complete })
```

- [ ] **Step 3: FocusMode の呼び出しを置換**

`front/src/components/MainScreen.jsx` の既存 `{focusOpen && ( <FocusMode ... /> )}` ブロック全体を次に置換:

```jsx
      {focusOpen && <FocusMode timer={timer} todos={todos} onClose={() => setFocusOpen(false)} />}
      {!focusOpen && <TimerChip timer={timer} onOpen={() => setFocusOpen(true)} />}
```

- [ ] **Step 4: CSS を追加**

`front/src/index.css` の末尾に追加:

```css
/* ─── Timer / Stopwatch ─── */
.timer-screen {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: var(--bg);
  overflow-y: auto;
}
.timer-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.timer-quick-toggles {
  display: flex;
  gap: 8px;
}
.timer-quick-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}
.timer-quick-btn.off {
  color: var(--muted);
  opacity: 0.6;
}
.timer-mode-switch {
  display: flex;
  gap: 6px;
  margin: 10px 0 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 4px;
}
.timer-mode-btn {
  padding: 10px 18px;
  border: none;
  border-radius: 9px;
  background: none;
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.timer-mode-btn.active {
  background: #3b82f6;
  color: #fff;
}
.timer-mode-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.timer-display {
  font-size: 68px;
  font-weight: 800;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  margin: 12px 0;
}
.timer-display.finished {
  color: #ef4444;
  animation: timer-blink 1s steps(2, start) infinite;
}
@keyframes timer-blink {
  50% {
    opacity: 0.3;
  }
}
.timer-finished-label {
  font-size: 16px;
  font-weight: 700;
  color: #ef4444;
  margin-bottom: 8px;
}
.timer-presets {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}
.timer-preset-chip {
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.timer-preset-chip.active {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}
.timer-task-area {
  margin-bottom: 20px;
}
.timer-task-pick {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px dashed var(--border);
  background: none;
  color: var(--muted);
  font-size: 14px;
  cursor: pointer;
}
.timer-task-linked {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 14px;
  max-width: 90vw;
}
.timer-task-name {
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.timer-task-clear {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.timer-controls {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}
.timer-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
.timer-btn.primary {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}
.timer-btn.ghost {
  color: var(--muted);
}
.timer-complete-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  padding: 12px 22px;
  border-radius: 12px;
  border: none;
  background: #10b981;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
.timer-pick-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
}
.timer-pick-sheet {
  width: 100%;
  max-height: 60vh;
  overflow-y: auto;
  background: var(--bg);
  border-radius: 18px 18px 0 0;
  padding: 16px;
}
.timer-pick-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 10px;
}
.timer-pick-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 14px;
  border: none;
  border-bottom: 1px solid var(--border);
  background: none;
  color: var(--text);
  font-size: 15px;
  cursor: pointer;
}
```

- [ ] **Step 5: ビルド確認**

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 6: 手動確認**

`npm run dev` でフォーカス（目アイコン）を開く。
Expected:
- ストップウォッチ/タイマーを切替できる（idle時のみ）。
- タイマー：プリセット選択→開始→カウントダウン、0で `timer_alarm_0X`（選択中）鳴動＋バイブ＋「時間です」点滅表示。停止でidleへ。
- ストップウォッチ：開始→カウントアップ、一時停止/再開/リセット。
- 「タスクにひも付ける」→未達から選択→タイトル表示→「このタスクを完了」で達成済になり計測リセット。
- 上部のミュート/バイブトグルが設定ページと即同期。

- [ ] **Step 7: コミット**

```bash
git add front/src/components/FocusMode.jsx front/src/components/MainScreen.jsx front/src/index.css
git commit -m "feat: フォーカスモードにストップウォッチ/タイマーを統合

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: 稼働中チップ `TimerChip`

**Files:**
- Create: `front/src/components/TimerChip.jsx`
- Modify: `front/src/index.css`

**Interfaces:**
- Consumes: `timer`（useTimer戻り値）, `onOpen()`, `useAppContext()`, `formatDuration`（useTimer）。
- Produces: フォーカス閉時に計測中(running/paused/finished)を示すピル。タップで `onOpen()`。

> MainScreen 側のレンダリング（`{!focusOpen && <TimerChip ... />}`）は Task 6 Step 3 で追加済み。

- [ ] **Step 1: ファイルを作成**

`front/src/components/TimerChip.jsx`:

```jsx
import { useAppContext } from '../contexts/AppContext'
import { formatDuration } from '../hooks/useTimer'

export default function TimerChip({ timer, onOpen }) {
  const { t } = useAppContext()
  if (timer.status === 'idle') return null

  const isTimer = timer.mode === 'timer'
  const finished = timer.status === 'finished'
  const label = finished
    ? t.timer.done
    : formatDuration(isTimer ? timer.remainingMs : timer.elapsedMs)
  const icon = isTimer ? 'fa-hourglass-half' : 'fa-stopwatch'

  return (
    <button className={`timer-chip${finished ? ' finished' : ''}`} onClick={onOpen}>
      <i className={`fa-solid ${icon}`} />
      <span className="timer-chip-time">{label}</span>
      {timer.status === 'paused' && <i className="fa-solid fa-pause timer-chip-sub" />}
    </button>
  )
}
```

- [ ] **Step 2: CSS を追加**

`front/src/index.css` の末尾に追加:

```css
/* ─── Timer chip (background running) ─── */
.timer-chip {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 50;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  border: none;
  background: #3b82f6;
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  cursor: pointer;
}
.timer-chip.finished {
  background: #ef4444;
  animation: timer-blink 1s steps(2, start) infinite;
}
.timer-chip-sub {
  font-size: 11px;
  opacity: 0.85;
}
```

- [ ] **Step 3: ビルド確認**

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 4: 手動確認**

`npm run dev`。
Expected:
- 計測を開始し `×` でフォーカスを閉じると、画面下部にチップ（モードアイコン＋ライブ時間、タイマーは残り）が出る。
- チップをタップでフォーカス再オープン。
- アプリ再読み込み後もチップが復元され、時間が正しい（タイマーが既に過ぎていれば「終了」表示）。
- 停止/リセットでチップが消える。

- [ ] **Step 5: コミット**

```bash
git add front/src/components/TimerChip.jsx front/src/index.css
git commit -m "feat: 計測の稼働中チップ(TimerChip)を追加

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: 最終ビルド検証とデプロイ

**Files:** なし（検証とデプロイのみ）

- [ ] **Step 1: 整形**

Run: `node node_modules/prettier/bin/prettier.cjs --write src/ vite.config.js`
Expected: 対象ファイルが整形される（差分があれば次stepでコミット）。

- [ ] **Step 2: 本番ビルド最終確認**

Run: `npm run build`
Expected: `✓ built` ＋ PWA生成（`dist/sw.js`）。警告(chunk size)は許容。

- [ ] **Step 3: 整形差分があればコミット**

```bash
git add -A front/src front/vite.config.js
git commit -m "chore: prettier整形" || echo "差分なし"
```

- [ ] **Step 4: push（Vercel自動デプロイ）**

```bash
git push origin main
```
Expected: push成功 → Vercelが自動デプロイ。

---

## Self-Review（記録）

- **Spec coverage:** 3章データモデル→Task1(AppContext)/Task4(timerState)。4-5章音声→Task2/Task4/Task5/Task6。6章useTimer→Task4。7章UI→Task5(設定)/Task6(FocusMode)/Task7(チップ)。8章i18n→Task1。9章CSS→Task5/6/7。10章PWA→Task3。11章エッジケース→useTimer(復元補正・vibrate `?.`・mp3 catch・durationMsガード)。12章検証→各Task build+手動、Task8。
- **Placeholder scan:** なし（全コード実体）。
- **Type consistency:** `start/pause/resume/reset/stopFinished/linkTask/clearTask/completeLinkedTask/setMode` と `formatDuration`、`toggleMute/toggleVibrate` の呼び名は Task4/2 の定義と Task5/6/7 の利用で一致。context キー（timerAlarm/soundMuted/vibrateEnabled）も Task1 定義と各利用で一致。
