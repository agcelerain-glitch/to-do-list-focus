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
