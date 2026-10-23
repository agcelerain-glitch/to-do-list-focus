import { createContext, useContext, useState, useLayoutEffect } from 'react'
import { translations } from '../i18n/translations'

const AppContext = createContext(null)

const COLOR_PREFIX = 'color-'
const COLOR_KEYS = ['normal', 'deuteranopia', 'protanopia', 'highcontrast']

export function AppProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'ja')
  const [colorMode, setColorModeState] = useState(
    () => localStorage.getItem('colorMode') || 'normal',
  )

  const [timerAlarm, setTimerAlarmState] = useState(() => localStorage.getItem('timerAlarm') || 'timer_alarm_01')
  const [soundMuted, setSoundMutedState] = useState(() => localStorage.getItem('soundMuted') === '1')
  const [vibrateEnabled, setVibrateEnabledState] = useState(() => localStorage.getItem('vibrateEnabled') !== '0')

  const setTimerAlarm = v => {
    setTimerAlarmState(v)
    localStorage.setItem('timerAlarm', v)
  }

  const setSoundMuted = v => {
    setSoundMutedState(v)
    localStorage.setItem('soundMuted', v ? '1' : '0')
  }

  const setVibrateEnabled = v => {
    setVibrateEnabledState(v)
    localStorage.setItem('vibrateEnabled', v ? '1' : '0')
  }

  const setLang = l => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }

  const setColorMode = m => {
    setColorModeState(m)
    localStorage.setItem('colorMode', m)
  }

  useLayoutEffect(() => {
    const root = document.documentElement
    COLOR_KEYS.forEach(k => root.classList.remove(`${COLOR_PREFIX}${k}`))
    if (colorMode !== 'normal') {
      root.classList.add(`${COLOR_PREFIX}${colorMode}`)
    }
  }, [colorMode])

  const t = translations[lang] ?? translations.ja

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        t,
        colorMode,
        setColorMode,
        timerAlarm,
        setTimerAlarm,
        soundMuted,
        setSoundMuted,
        vibrateEnabled,
        setVibrateEnabled,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => useContext(AppContext)
