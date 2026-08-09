import TodoItem from './TodoItem'
import { useAppContext } from '../contexts/AppContext'

export default function TodoList({ todos, onBack, onComplete, onRevive, onRemove, user, onLogout }) {
  const { t } = useAppContext()
  const l = t.list
  const pending = todos.filter(todo => !todo.completed)
  const completed = todos.filter(todo => todo.completed)

  return (
    <div className="panel-inner">
      <div className="panel-header">
        <button className="header-back-btn" onClick={onBack} aria-label="戻る">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <span className="header-title">{l.header}</span>
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
        {/* 未達 */}
        <div className="todo-section">
          <div className="todo-section-header">
            <i className="fa-solid fa-circle-dot" style={{ color: '#F59E0B' }} />
            {l.pending}
            <span className="todo-count-badge">{pending.length}</span>
          </div>
          {pending.length === 0 ? (
            <div className="empty-state">
              <i className="fa-solid fa-check-circle" />
              <p>{l.emptyPending}</p>
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

        {/* 達成済 */}
        {completed.length > 0 && (
          <>
            <div className="section-divider-line">
              <span>{l.completed}</span>
            </div>
            <div className="todo-section">
              <div className="todo-section-header">
                <i className="fa-solid fa-circle-check" style={{ color: '#10B981' }} />
                {l.completed}
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
