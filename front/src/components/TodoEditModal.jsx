import { useState, useEffect } from 'react'
import { useAppContext } from '../contexts/AppContext'

export default function TodoEditModal({ todo, onClose, onSave }) {
  const { t } = useAppContext()
  const e = t.edit

  const [title, setTitle] = useState(todo.title)
  const [content, setContent] = useState(todo.content || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handleKey = k => k.key === 'Escape' && onClose()
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSave = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    await onSave(todo.id, title.trim(), content.trim())
    setSaving(false)
    onClose()
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div
        className="detail-sheet"
        onClick={ev => ev.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={e.header}
      >
        <div className="detail-drag-handle" />

        <div className="detail-header">
          <span className="detail-title-label">{e.header}</span>
          <button className="detail-close-btn" onClick={onClose} aria-label={e.cancel}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="detail-body">
          <label className="edit-label">{e.titleLabel}</label>
          <input
            className="edit-input"
            value={title}
            onChange={ev => setTitle(ev.target.value)}
            maxLength={100}
            autoFocus
          />

          <label className="edit-label">{e.contentLabel}</label>
          <textarea
            className="edit-textarea"
            value={content}
            onChange={ev => setContent(ev.target.value)}
            maxLength={1000}
            rows={5}
          />

          <button
            className="edit-btn-save"
            onClick={handleSave}
            disabled={!title.trim() || saving}
          >
            {saving ? e.saving : e.save}
          </button>
        </div>
      </div>
    </div>
  )
}
