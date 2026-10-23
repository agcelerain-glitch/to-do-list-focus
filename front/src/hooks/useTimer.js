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
  const finishedRef = useRef(false)

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
      if (finishedRef.current) return
      finishedRef.current = true
      setState(s => ({ ...s, status: 'finished', accumulatedMs: s.durationMs, startedAt: null }))
      if (!mutedRef.current && alarmRef.current) alarmRef.current.play()
      vibrate([400, 200, 400], { enabled: vibRef.current })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, state.status, state.mode, state.durationMs])

  const start = useCallback(
    (mode, { durationMs = null, taskId = null, taskTitle = null } = {}) => {
      finishedRef.current = false
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
    finishedRef.current = false
    if (alarmRef.current) alarmRef.current.stop()
    playSound('reset_01', { muted: soundMuted })
    setState(s => ({ ...initialState, mode: s.mode }))
  }, [soundMuted])

  const stopFinished = useCallback(() => {
    finishedRef.current = false
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
    finishedRef.current = false
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
