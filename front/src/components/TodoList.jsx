import { useState } from 'react'
import TodoItem from './TodoItem'
import TodoDetailModal from './TodoDetailModal'
import TodoEditModal from './TodoEditModal'
import { useAppContext } from '../contexts/AppContext'
import { priorityRank } from '../constants/priority'

export default function TodoList({ todos, onBack, onComplete, onRevive, onRemove, onUpdate, onSetPriority, listRef }) {
  const { t } = useAppContext()
  const l = t.list
  const [selectedTodo, setSelectedTodo] = useState(null)
  const [editingTodo, setEditingTodo] = useState(null)

  const openEdit = todo => {
    setSelectedTodo(null)
    setEditingTodo(todo)
  }
  // 取得順(createdAt desc)を保ったまま優先度キーで安定ソート。
  // 高→中→低→未設定の順。各グループ内は新しい順のまま。
  const pending = todos
    .filter(todo => !todo.completed)
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
  // 達成済みは完了日順(取得順)のまま。バッジのみ表示する。
  const completed = todos.filter(todo => todo.completed)

  return (
    <div className="panel-inner">
      <div className="panel-header">
        <button className="header-back-btn" onClick={onBack} aria-label="戻る">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <span className="header-title">{l.header}</span>
      </div>

      <div className="todo-list-container" ref={listRef}>
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
                onTap={setSelectedTodo}
                onEdit={openEdit}
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
                  onTap={setSelectedTodo}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {selectedTodo && (
        <TodoDetailModal
          todo={selectedTodo}
          onClose={() => setSelectedTodo(null)}
          onEdit={openEdit}
          onSetPriority={onSetPriority}
        />
      )}
      {editingTodo && (
        <TodoEditModal
          todo={editingTodo}
          onClose={() => setEditingTodo(null)}
          onSave={onUpdate}
        />
      )}
    </div>
  )
}
