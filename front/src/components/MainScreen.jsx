import { useState, useRef } from 'react'
import CreatePanel from './CreatePanel'
import TodoList from './TodoList'
import { useTodos } from '../hooks/useTodos'

export default function MainScreen({ user, onLogout }) {
  const [mode, setMode] = useState('split') // 'split' | 'create' | 'list'
  const touchStartY = useRef(null)
  const { todos, add, complete, revive, remove } = useTodos(user.uid)
  const pendingCount = todos.filter(t => !t.completed).length

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return
    const delta = e.changedTouches[0].clientY - touchStartY.current
    touchStartY.current = null
    if (Math.abs(delta) < 60) return

    if (delta > 0) {
      // スワイプ下 → 作成モード
      setMode(prev => prev === 'list' ? 'split' : 'create')
    } else {
      // スワイプ上 → 一覧モード
      setMode(prev => prev === 'create' ? 'split' : 'list')
    }
  }

  return (
    <div
      className={`main-layout mode-${mode}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 上パネル - 追加 */}
      <div className="panel panel-create">
        {mode === 'split' && (
          <button className="split-content create-split" onClick={() => setMode('create')}>
            <div className="split-icon-wrap">
              <i className="fa-solid fa-plus" />
            </div>
            <div className="split-label">タスク追加</div>
            <div className="split-hint">↓ スワイプ または タップ</div>
          </button>
        )}
        {mode === 'create' && (
          <CreatePanel onBack={() => setMode('split')} onAdd={add} />
        )}
        {mode === 'list' && (
          <button className="tab-bar tab-create" onClick={() => setMode('create')}>
            <i className="fa-solid fa-chevron-down" />
            <span>タスク追加</span>
          </button>
        )}
      </div>

      {/* 下パネル - 一覧 */}
      <div className="panel panel-list">
        {mode === 'split' && (
          <button className="split-content list-split" onClick={() => setMode('list')}>
            <div className="split-icon-wrap">
              <i className="fa-solid fa-list-check" />
            </div>
            <div className="split-label">タスク確認</div>
            <div className="split-hint">
              {pendingCount > 0 ? `未達 ${pendingCount}件` : 'タスクなし'}
            </div>
            <div className="split-hint">↑ スワイプ または タップ</div>
          </button>
        )}
        {mode === 'list' && (
          <TodoList
            todos={todos}
            onBack={() => setMode('split')}
            onComplete={complete}
            onRevive={revive}
            onRemove={remove}
            user={user}
            onLogout={onLogout}
          />
        )}
        {mode === 'create' && (
          <button className="tab-bar tab-list" onClick={() => setMode('list')}>
            <i className="fa-solid fa-chevron-up" />
            <span>
              タスク確認{pendingCount > 0 ? ` (${pendingCount})` : ''}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
