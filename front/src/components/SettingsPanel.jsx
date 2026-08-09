import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAppContext } from '../contexts/AppContext'

const LANGS = [
  { key: 'ja', label: '日本語' },
  { key: 'en', label: 'English' },
  { key: 'zh', label: '中文（简体）' },
]

const COLOR_MODES = [
  { key: 'normal',        dot: '#3B82F6' },
  { key: 'deuteranopia',  dot: '#F59E0B' },
  { key: 'protanopia',    dot: '#7C3AED' },
  { key: 'highcontrast',  dot: '#000000' },
]

export default function SettingsPanel({ user, onClose }) {
  const { t, lang, setLang, colorMode, setColorMode } = useAppContext()
  const s = t.settings

  const [msg, setMsg] = useState('')
  const [fbStatus, setFbStatus] = useState('idle') // idle | sending | sent

  const sendFeedback = async () => {
    if (!msg.trim() || fbStatus !== 'idle') return
    setFbStatus('sending')
    try {
      await addDoc(collection(db, 'feedback'), {
        uid: user.uid,
        message: msg.trim(),
        lang,
        createdAt: serverTimestamp(),
      })
      setMsg('')
      setFbStatus('sent')
      setTimeout(() => setFbStatus('idle'), 3500)
    } catch {
      setFbStatus('idle')
    }
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-sheet" onClick={e => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="settings-drag-handle" />

        {/* Header */}
        <div className="settings-header">
          <span className="settings-title">{s.title}</span>
          <button className="settings-close-btn" onClick={onClose} aria-label="閉じる">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Body */}
        <div className="settings-body">

          {/* ── Feedback ── */}
          <div className="settings-section">
            <div className="settings-section-title">
              <i className="fa-solid fa-comment-dots" />
              {s.feedback.title}
            </div>
            <label className="settings-label">{s.feedback.label}</label>
            <textarea
              className="settings-textarea"
              placeholder={s.feedback.placeholder}
              value={msg}
              onChange={e => setMsg(e.target.value)}
              maxLength={500}
              rows={4}
              disabled={fbStatus !== 'idle'}
            />
            {fbStatus === 'sent' ? (
              <div className="feedback-success">
                <i className="fa-solid fa-circle-check" />
                {s.feedback.sent}
              </div>
            ) : (
              <button
                className="settings-btn-primary"
                onClick={sendFeedback}
                disabled={!msg.trim() || fbStatus === 'sending'}
              >
                {fbStatus === 'sending' ? s.feedback.sending : s.feedback.submit}
              </button>
            )}
          </div>

          {/* ── Language ── */}
          <div className="settings-section">
            <div className="settings-section-title">
              <i className="fa-solid fa-language" />
              {s.language.title}
            </div>
            <div className="settings-radio-group">
              {LANGS.map(l => (
                <button
                  key={l.key}
                  className={`settings-radio-btn${lang === l.key ? ' active' : ''}`}
                  onClick={() => setLang(l.key)}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <p className="settings-note">{s.language.note}</p>
          </div>

          {/* ── Color Accessibility ── */}
          <div className="settings-section">
            <div className="settings-section-title">
              <i className="fa-solid fa-palette" />
              {s.color.title}
            </div>
            <div className="settings-color-list">
              {COLOR_MODES.map(m => (
                <button
                  key={m.key}
                  className={`settings-color-btn${colorMode === m.key ? ' active' : ''}`}
                  onClick={() => setColorMode(m.key)}
                >
                  <span
                    className="color-dot"
                    style={{ background: m.dot }}
                  />
                  {s.color[m.key === 'highcontrast' ? 'highContrast'
                    : m.key === 'deuteranopia' ? 'deuteranopia'
                    : m.key === 'protanopia' ? 'protanopia'
                    : 'normal']}
                  {colorMode === m.key && (
                    <i className="fa-solid fa-check" style={{ marginLeft: 'auto', fontSize: 14 }} />
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
