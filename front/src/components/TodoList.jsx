import TodoItem from './TodoItem'

export default function TodoList({ todos, onBack, onComplete, onRevive, onRemove, user, onLogout }) {
  const pending = todos.filter(t => !t.completed)
  const completed = todos.filter(t => t.completed)

  return (
    <div className="panel-inner">
      <div className="panel-header">
        <button className="header-back-btn" onClick={onBack} aria-label="戻る">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <span className="header-title">タスク一覧</span>
        <div className="header-actions">
          {user.photoURL && (
            <div className="user-avatar">
              <img src={user.photoURL} alt={user.displayName} referrerPolicy="no-referrer" />
            </div>
          )}
          <button className="header-icon-btn" onClick={onLogout} aria-label="ログアウト">
            <i className="fa-solid fa-right-from-bracket" />
          </button>
        </div>
      </div>

      <div className="todo-list-container">
        <div className="todo-section">
          <div className="todo-section-header">
            <i className="fa-solid fa-circle-dot" style={{ color: '#F59E0B' }} />
            未達
            <span className="todo-count-badge">{pending.length}</span>
          </div>
          {pending.length === 0 ? (
            <div className="empty-state">
              <i className="fa-solid fa-check-circle" />
              <p>未達のタスクはありません</p>
            </div>
          ) : (
            pending.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onComplete={onComplete}
                onRevive={onRevive}
                onRemove={onRemove}
              />
            ))
          )}
        </div>

        {completed.length > 0 && (
          <>
            <div className="section-divider-line">
              <span>達成済</span>
            </div>
            <div className="todo-section">
              <div className="todo-section-header">
                <i className="fa-solid fa-circle-check" style={{ color: '#10B981' }} />
                達成済
                <span className="todo-count-badge">{completed.length}</span>
              </div>
              {completed.map(todo => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onComplete={onComplete}
                  onRevive={onRevive}
                  onRemove={onRemove}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
