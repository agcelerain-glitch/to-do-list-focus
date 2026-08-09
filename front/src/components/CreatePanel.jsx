import { useState } from 'react'
import { useAppContext } from '../contexts/AppContext'

export default function CreatePanel({ onBack, onAdd }) {
  const { t } = useAppContext()
  const c = t.create
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || submitting) return
    setSubmitting(true)
    try {
      await onAdd(title.trim(), content.trim())
      setTitle('')
      setContent('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
  }

  return (
    <div className="panel-inner">
      <div className="panel-header">
        <button className="header-back-btn" onClick={onBack} aria-label="戻る">
          <i className="fa-solid fa-arrow-left" />
        </button>
        <span className="header-title">{c.header}</span>
      </div>

      <div className="create-form-container" onKeyDown={handleKeyDown}>
        <div className="create-form">
          <div className="form-group">
            <label className="form-label">{c.titleLabel}</label>
            <input
              className="form-input"
              type="text"
              placeholder={c.titlePh}
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{c.contentLabel}</label>
            <textarea
              className="form-textarea"
              placeholder={c.contentPh}
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={500}
              rows={5}
            />
          </div>

          <button
            className="btn-submit"
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
          >
            <i className="fa-solid fa-plus" />
            {submitting ? c.submitting : c.submit}
          </button>
        </div>
      </div>
    </div>
  )
}
