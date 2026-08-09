import { createContext, useContext, useState, useEffect } from 'react'
import { translations } from '../i18n/translations'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'ja')
  const [colorMode, setColorModeState] = useState(
    () => localStorage.getItem('colorMode') || 'normal',
  )

  const setLang = (l) => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }

  const setColorMode = (m) => {
    setColorModeState(m)
    localStorage.setItem('colorMode', m)
  }

  useEffect(() => {
    const root = document.documentElement
    root.className = colorMode === 'normal' ? '' : `color-${colorMode}`
  }, [colorMode])

  const t = translations[lang] ?? translations.ja

  return (
    <AppContext.Provider value={{ lang, setLang, t, colorMode, setColorMode }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => useContext(AppContext)
