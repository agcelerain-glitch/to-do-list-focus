import { useAppContext } from '../contexts/AppContext'
import { PRIORITY_ICON } from '../constants/priority'

function formatDate(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TodoItem({ todo, onComplete, onRevive, onRemove, onTap, onEdit }) {
  const { t } = useAppContext()
  const p = t.priority

  return (
    <div className={`todo-item${todo.completed ? ' completed' : ''}`}>
      <div
        className="todo-item-content"
        onClick={() => onTap && onTap(todo)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onTap && onTap(todo)}
        aria-label={`${todo.title} の詳細を表示`}
      >
        <div className="todo-item-title">
          {todo.priority && (
            <span
              className={`priority-badge prio-${todo.priority}`}
              aria-label={p.aria.replace('{level}', p[todo.priority])}
            >
              <i className={`fa-solid ${PRIORITY_ICON[todo.priority]}`} aria-hidden="true" />
              {p[todo.priority]}
            </span>
          )}
          {todo.title}
        </div>
        {todo.content && <div className="todo-item-body">{todo.content}</div>}
        <div className="todo-item-date">
          {todo.completed
            ? `${t.list.completedPrefix}${formatDate(todo.completedAt)}`
            : formatDate(todo.createdAt)}
        </div>
      </div>

      <div className="todo-item-actions">
        {!todo.completed ? (
          <>
            <button
              className="action-btn btn-edit"
              onClick={e => {
                e.stopPropagation()
                onEdit && onEdit(todo)
              }}
              aria-label="編集"
            >
              <i className="fa-solid fa-pen" />
            </button>
            <button
              className="action-btn btn-complete"
              onClick={() => onComplete(todo.id)}
              aria-label="完了"
            >
              <i className="fa-solid fa-check" />
            </button>
          </>
        ) : (
          <>
            <button
              className="action-btn btn-revive"
              onClick={() => onRevive(todo.id)}
              aria-label="復活"
            >
              <i className="fa-solid fa-rotate-left" />
            </button>
            <button
              className="action-btn btn-delete"
              onClick={() => onRemove(todo.id)}
              aria-label="削除"
            >
              <i className="fa-solid fa-trash" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
