import { useState } from 'react'

export default function CreatePanel({ onBack, onAdd }) {
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
        <span className="header-title">タスクを追加</span>
      </div>

      <div className="create-form-container" onKeyDown={handleKeyDown}>
        <div className="create-form">
          <div className="form-group">
            <label className="form-label">タイトル *</label>
            <input
              className="form-input"
              type="text"
              placeholder="何をしますか？"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label className="form-label">内容</label>
            <textarea
              className="form-textarea"
              placeholder="詳細を入力（任意）"
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
            {submitting ? '追加中...' : 'タスクを追加'}
          </button>
        </div>
      </div>
    </div>
  )
}
