import { useState } from 'react'
import { useAppContext } from '../contexts/AppContext'

export default function FocusMode({ todos, onClose, onComplete }) {
  const { t } = useAppContext()
  const f = t.focus
  const [focusTask, setFocusTask] = useState(null)
  const [completing, setCompleting] = useState(false)

  const pending = todos.filter(todo => !todo.completed)

  const handleComplete = async () => {
    if (!focusTask || completing) return
    setCompleting(true)
    await onComplete(focusTask.id)
  }

  return (
    <div className="focus-overlay">
      {!focusTask ? (
        /* ── Task selection ── */
        <div className="focus-select-screen">
          <div className="focus-select-header">
            <button className="focus-close-btn" onClick={onClose} aria-label="閉じる">
              <i className="fa-solid fa-xmark" />
            </button>
            <div className="focus-eye-anim">
              <i className="fa-solid fa-eye" />
            </div>
            <h2 className="focus-title">{f.title}</h2>
            <p className="focus-subtitle">{f.subtitle}</p>
          </div>

          <div className="focus-task-list">
            {pending.length === 0 ? (
              <div className="focus-empty">{f.noTask}</div>
            ) : (
              pending.map(todo => (
                <button
                  key={todo.id}
                  className="focus-task-item"
                  onClick={() => setFocusTask(todo)}
                >
                  <span className="focus-task-title">{todo.title}</span>
                  {todo.content && (
                    <span className="focus-task-body">{todo.content}</span>
                  )}
                  <i className="fa-solid fa-arrow-right focus-task-arrow" />
                </button>
              ))
            )}
          </div>

          <button className="focus-cancel-btn" onClick={onClose}>
            {f.cancel}
          </button>
        </div>
      ) : (
        /* ── Active focus ── */
        <div className="focus-active-screen">
          <button className="focus-exit-btn" onClick={() => setFocusTask(null)}>
            <i className="fa-solid fa-arrow-left" />
            {f.exit}
          </button>

          <div className="focus-active-center">
            <div className="focus-eye-anim">
              <i className="fa-solid fa-eye" />
            </div>
            <div className="focus-declaration">{f.declaration}</div>
            <div className="focus-active-title">{focusTask.title}</div>
            {focusTask.content && (
              <div className="focus-active-body">{focusTask.content}</div>
            )}
          </div>

          <button
            className="focus-complete-btn"
            onClick={handleComplete}
            disabled={completing}
          >
            <i className="fa-solid fa-check" />
            {f.complete}
          </button>
        </div>
      )}
    </div>
  )
}
