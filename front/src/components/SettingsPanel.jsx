import { useState } from 'react'
import { useAppContext } from '../contexts/AppContext'
import { playSound, toggleMute, toggleVibrate } from '../lib/sound'

const LANGS = [
  { key: 'ja', label: '日本語' },
  { key: 'en', label: 'English' },
  { key: 'zh', label: '中文（简体）' },
]

const COLOR_MODES = [
  { key: 'normal', dot: '#3B82F6' },
  { key: 'deuteranopia', dot: '#B45309' },
  { key: 'protanopia', dot: '#7C3AED' },
  { key: 'highcontrast', dot: '#0000CC' },
]

const ALARMS = ['timer_alarm_01', 'timer_alarm_02', 'timer_alarm_03', 'timer_alarm_04']

export default function SettingsPanel({ user, onClose, onLogout }) {
  const {
    t,
    lang,
    setLang,
    colorMode,
    setColorMode,
    timerAlarm,
    setTimerAlarm,
    soundMuted,
    setSoundMuted,
    vibrateEnabled,
    setVibrateEnabled,
  } = useAppContext()
  const s = t.settings

  const [msg, setMsg] = useState('')
  const [fbStatus, setFbStatus] = useState('idle') // idle | sending | sent
  const [reloading, setReloading] = useState(false)

  const handleReload = async () => {
    setReloading(true)
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.update()))
    }
    window.location.reload()
  }

  const sendFeedback = async () => {
    if (!msg.trim() || fbStatus !== 'idle') return
    setFbStatus('sending')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg.trim(),
          lang,
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
        }),
      })
      if (!res.ok) throw new Error('failed')
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
          {/* ── User ── */}
          <div className="settings-user-card">
            {user.photoURL && (
              <img
                className="settings-user-avatar"
                src={user.photoURL}
                alt={user.displayName}
                referrerPolicy="no-referrer"
              />
            )}
            <div className="settings-user-info">
              <span className="settings-user-name">{user.displayName}</span>
              <span className="settings-user-email">{user.email}</span>
            </div>
          </div>

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

          {/* ── Sound ── */}
          <div className="settings-section">
            <div className="settings-section-title">
              <i className="fa-solid fa-volume-high" />
              {s.sound.title}
            </div>

            <div className="sound-toggle-row">
              <span>{s.sound.mute}</span>
              <button
                className={`sound-switch${soundMuted ? ' on' : ''}`}
                onClick={() => toggleMute(soundMuted, setSoundMuted)}
                role="switch"
                aria-checked={soundMuted}
                aria-label={s.sound.mute}
              >
                <span className="sound-switch-knob" />
              </button>
            </div>

            <div className="sound-toggle-row">
              <span>{s.sound.vibrate}</span>
              <button
                className={`sound-switch${vibrateEnabled ? ' on' : ''}`}
                onClick={() => toggleVibrate(vibrateEnabled, setVibrateEnabled)}
                role="switch"
                aria-checked={vibrateEnabled}
                aria-label={s.sound.vibrate}
              >
                <span className="sound-switch-knob" />
              </button>
            </div>
            <p className="settings-note">{s.sound.vibrateNote}</p>

            <label className="settings-label">{s.sound.alarm}</label>
            <div className="sound-alarm-list">
              {ALARMS.map((key, i) => (
                <div
                  key={key}
                  className={`sound-alarm-row${timerAlarm === key ? ' active' : ''}`}
                >
                  <button className="sound-alarm-select" onClick={() => setTimerAlarm(key)}>
                    <span className={`sound-radio${timerAlarm === key ? ' on' : ''}`} />
                    {s.sound[`alarm${i + 1}`]}
                  </button>
                  <button
                    className="sound-preview-btn"
                    onClick={() => playSound(key, { force: true })}
                    aria-label={s.sound.preview}
                  >
                    <i className="fa-solid fa-play" />
                  </button>
                </div>
              ))}
            </div>
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
                  <span className="color-dot" style={{ background: m.dot }} />
                  {
                    s.color[
                      m.key === 'highcontrast'
                        ? 'highContrast'
                        : m.key === 'deuteranopia'
                          ? 'deuteranopia'
                          : m.key === 'protanopia'
                            ? 'protanopia'
                            : 'normal'
                    ]
                  }
                  {colorMode === m.key && (
                    <i className="fa-solid fa-check" style={{ marginLeft: 'auto', fontSize: 14 }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Reload ── */}
          <div className="settings-section">
            <div className="settings-section-title">
              <i className="fa-solid fa-rotate" />
              {s.reload.title}
            </div>
            <p className="settings-note">{s.reload.desc}</p>
            <button className="settings-btn-reload" onClick={handleReload} disabled={reloading}>
              <i className="fa-solid fa-rotate" />
              {s.reload.btn}
            </button>
          </div>

          {/* ── Logout ── */}
          <button className="settings-btn-logout" onClick={onLogout}>
            <i className="fa-solid fa-right-from-bracket" />
            {s.logout}
          </button>
        </div>
      </div>
    </div>
  )
}
