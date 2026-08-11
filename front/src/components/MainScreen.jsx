import { useState, useRef } from 'react'
import CreatePanel from './CreatePanel'
import TodoList from './TodoList'
import SettingsPanel from './SettingsPanel'
import FocusMode from './FocusMode'
import { useTodos } from '../hooks/useTodos'
import { useAppContext } from '../contexts/AppContext'

export default function MainScreen({ user, onLogout }) {
  const { t } = useAppContext()
  const [mode, setMode] = useState('split') // 'split' | 'create' | 'list'
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const touchStartY = useRef(null)
  const { todos, add, complete, revive, update, remove } = useTodos(user.uid)
  const pendingCount = todos.filter(todo => !todo.completed).length

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return
    const delta = e.changedTouches[0].clientY - touchStartY.current
    touchStartY.current = null
    if (Math.abs(delta) < 60) return
    if (delta > 0) {
      setMode(prev => prev === 'list' ? 'split' : 'create')
    } else {
      setMode(prev => prev === 'create' ? 'split' : 'list')
    }
  }

  const pendingText = pendingCount > 0
    ? t.tab.pendingN.replace('{n}', pendingCount)
    : t.tab.noTask

  return (
    <div
      className={`main-layout mode-${mode}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── 上パネル (追加) ── */}
      <div className="panel panel-create">
        {mode === 'split' && (
          <button className="split-content create-split" onClick={() => setMode('create')}>
            <div className="split-icon-wrap">
              <i className="fa-solid fa-plus" />
            </div>
            <div className="split-label">{t.tab.addTask}</div>
            <div className="split-hint">{t.tab.swipeDown}</div>
          </button>
        )}
        {mode === 'create' && (
          <CreatePanel onBack={() => setMode('split')} onAdd={add} />
        )}
        {mode === 'list' && (
          <button className="tab-bar tab-create" onClick={() => setMode('create')}>
            <i className="fa-solid fa-chevron-down" />
            <span>{t.tab.addTask}</span>
          </button>
        )}
      </div>

      {/* ── 境界ピル (split時のみ) ── */}
      {mode === 'split' && (
        <div className="divider-pill">
          <button
            className="divider-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="設定を開く"
          >
            <i className="fa-solid fa-gear" />
          </button>
          <div className="divider-sep" />
          <button
            className="divider-btn"
            onClick={() => setFocusOpen(true)}
            aria-label="フォーカスモードを開く"
          >
            <i className="fa-solid fa-eye" />
          </button>
        </div>
      )}

      {/* ── 下パネル (一覧) ── */}
      <div className="panel panel-list">
        {mode === 'split' && (
          <button className="split-content list-split" onClick={() => setMode('list')}>
            <div className="split-icon-wrap">
              <i className="fa-solid fa-list-check" />
            </div>
            <div className="split-label">{t.tab.viewTask}</div>
            <div className="split-hint">{pendingText}</div>
            <div className="split-hint">{t.tab.swipeUp}</div>
          </button>
        )}
        {mode === 'list' && (
          <TodoList
            todos={todos}
            onBack={() => setMode('split')}
            onComplete={complete}
            onRevive={revive}
            onUpdate={update}
            onRemove={remove}
          />
        )}
        {mode === 'create' && (
          <button className="tab-bar tab-list" onClick={() => setMode('list')}>
            <i className="fa-solid fa-chevron-up" />
            <span>
              {t.tab.viewTask}{pendingCount > 0 ? ` (${pendingCount})` : ''}
            </span>
          </button>
        )}
      </div>

      {/* ── オーバーレイ ── */}
      {settingsOpen && (
        <SettingsPanel user={user} onClose={() => setSettingsOpen(false)} onLogout={onLogout} />
      )}
      {focusOpen && (
        <FocusMode
          todos={todos}
          onClose={() => setFocusOpen(false)}
          onComplete={async (id) => {
            await complete(id)
            setFocusOpen(false)
          }}
        />
      )}
    </div>
  )
}
