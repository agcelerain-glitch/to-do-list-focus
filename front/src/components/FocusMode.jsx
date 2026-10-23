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
  const [custom, setCustom] = useState(false)
  const [customH, setCustomH] = useState(0)
  const [customM, setCustomM] = useState(25)
  const [customS, setCustomS] = useState(0)

  const pending = todos.filter(todo => !todo.completed)
  const isTimer = timer.mode === 'timer'
  const idle = timer.status === 'idle'
  const linkedAlive = !!timer.taskId && todos.some(td => td.id === timer.taskId && !td.completed)

  // 設定時間(ms): カスタム時は時分秒、通常はプリセット分
  const inputMs = custom ? (customH * 3600 + customM * 60 + customS) * 1000 : presetMin * 60 * 1000
  // 表示値: タイマーidleは設定時間、以降は残り/経過
  const displayMs = isTimer ? (idle ? inputMs : timer.remainingMs) : timer.elapsedMs
  const canStart = !isTimer || inputMs > 0

  // 数値入力を 0〜max にクランプ（空欄は0扱い）
  const clampInt = (v, max) => {
    const n = parseInt(v, 10)
    if (Number.isNaN(n)) return 0
    return Math.min(Math.max(n, 0), max)
  }

  const handleStart = () => {
    if (isTimer) {
      if (inputMs <= 0) return
      timer.start('timer', {
        durationMs: inputMs,
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
          <button className="timer-back-btn" onClick={onClose} aria-label={tm.back}>
            <i className="fa-solid fa-arrow-left" />
            <span>{tm.back}</span>
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

        {/* タイマーidle時: プリセット + カスタム */}
        {isTimer && idle && (
          <>
            <div className="timer-presets">
              {PRESETS.map(min => (
                <button
                  key={min}
                  className={`timer-preset-chip${!custom && presetMin === min ? ' active' : ''}`}
                  onClick={() => {
                    setCustom(false)
                    setPresetMin(min)
                  }}
                >
                  {tm.presetMin.replace('{n}', String(min))}
                </button>
              ))}
              <button
                className={`timer-preset-chip${custom ? ' active' : ''}`}
                onClick={() => setCustom(true)}
              >
                {tm.custom}
              </button>
            </div>
            {custom && (
              <div className="timer-custom">
                <label className="timer-custom-field">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={customH}
                    onChange={e => setCustomH(clampInt(e.target.value, 23))}
                  />
                  <span>{tm.hours}</span>
                </label>
                <label className="timer-custom-field">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={customM}
                    onChange={e => setCustomM(clampInt(e.target.value, 59))}
                  />
                  <span>{tm.minutes}</span>
                </label>
                <label className="timer-custom-field">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={customS}
                    onChange={e => setCustomS(clampInt(e.target.value, 59))}
                  />
                  <span>{tm.seconds}</span>
                </label>
              </div>
            )}
          </>
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
            <button className="timer-btn primary" onClick={handleStart} disabled={!canStart}>
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
          <button
            className="timer-complete-btn"
            onClick={timer.completeLinkedTask}
            disabled={!linkedAlive}
          >
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
