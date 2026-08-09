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

export default function TodoItem({ todo, onComplete, onRevive, onRemove }) {
  return (
    <div className={`todo-item${todo.completed ? ' completed' : ''}`}>
      <div className="todo-item-content">
        <div className="todo-item-title">{todo.title}</div>
        {todo.content && (
          <div className="todo-item-body">{todo.content}</div>
        )}
        <div className="todo-item-date">
          {todo.completed
            ? `完了: ${formatDate(todo.completedAt)}`
            : formatDate(todo.createdAt)
          }
        </div>
      </div>

      <div className="todo-item-actions">
        {!todo.completed ? (
          <button
            className="action-btn btn-complete"
            onClick={() => onComplete(todo.id)}
            aria-label="完了にする"
          >
            <i className="fa-solid fa-check" />
          </button>
        ) : (
          <>
            <button
              className="action-btn btn-revive"
              onClick={() => onRevive(todo.id)}
              aria-label="復活させる"
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
