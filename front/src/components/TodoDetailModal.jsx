import { useEffect } from 'react'
import { useAppContext } from '../contexts/AppContext'

function formatDate(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TodoDetailModal({ todo, onClose }) {
  const { t } = useAppContext()
  const d = t.detail

  useEffect(() => {
    const handleKey = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div
        className="detail-sheet"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={todo.title}
      >
        <div className="detail-drag-handle" />

        <div className="detail-header">
          <span className="detail-title-label">
            {todo.completed
              ? <><i className="fa-solid fa-circle-check" style={{ color: '#10B981', marginRight: 8 }} /></>
              : <><i className="fa-solid fa-circle-dot" style={{ color: '#F59E0B', marginRight: 8 }} /></>
            }
            {todo.title}
          </span>
          <button className="detail-close-btn" onClick={onClose} aria-label={d.close}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="detail-body">
          <p className="detail-content">
            {todo.content || <span className="detail-no-content">{d.noContent}</span>}
          </p>
          <div className="detail-meta">
            <span>{d.created}: {formatDate(todo.createdAt)}</span>
            {todo.completed && todo.completedAt && (
              <span>{d.completedAt}: {formatDate(todo.completedAt)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
