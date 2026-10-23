// 音声・バイブのユーティリティ。mp3 は public/sounds/ に配置（ビルド後は /sounds/）。
const BASE = '/sounds'

// 操作音・試聴用の単発再生。muted かつ force でなければ鳴らさない。再生失敗は握りつぶす。
export function playSound(name, { muted = false, force = false } = {}) {
  if (muted && !force) return
  try {
    const audio = new Audio(`${BASE}/${name}.mp3`)
    const p = audio.play()
    if (p && typeof p.catch === 'function') p.catch(() => {})
  } catch {
    /* noop */
  }
}

// アラーム用。開始(ユーザー操作)時に unlock() で自動再生制約を解除し、終了時に play()。
// unlock は volume=0 で一瞬だけ再生→停止するので音は鳴らない（iOS の解錠対策）。
export function createAlarm(name) {
  const src = `${BASE}/${name}.mp3`
  let audio = null
  return {
    unlock() {
      try {
        audio = new Audio(src)
        audio.volume = 0
        const p = audio.play()
        if (p && typeof p.then === 'function') {
          p.then(() => {
            audio.pause()
            audio.currentTime = 0
            audio.volume = 1
          }).catch(() => {})
        }
      } catch {
        audio = null
      }
    },
    play() {
      try {
        if (!audio) audio = new Audio(src)
        audio.volume = 1
        audio.currentTime = 0
        const p = audio.play()
        if (p && typeof p.catch === 'function') p.catch(() => {})
      } catch {
        /* noop */
      }
    },
    stop() {
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    },
  }
}

// バイブ。enabled かつ navigator.vibrate 対応時のみ。
export function vibrate(pattern, { enabled = true } = {}) {
  if (!enabled) return
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern)
    } catch {
      /* noop */
    }
  }
}

// ミュート切替。解除(=音が戻る)時のみ reset 音でフィードバック。設定・フォーカス両画面で共用。
export function toggleMute(soundMuted, setSoundMuted) {
  const next = !soundMuted
  setSoundMuted(next)
  if (!next) playSound('reset_01', { force: true })
}

// バイブ切替。有効化時のみ短い確認バイブ。ミュート解除音と対になる触覚フィードバック。
export function toggleVibrate(vibrateEnabled, setVibrateEnabled) {
  const next = !vibrateEnabled
  setVibrateEnabled(next)
  if (next) vibrate(80, { enabled: true })
}
