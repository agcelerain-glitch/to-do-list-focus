import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../firebase/config'

export function useAuth() {
  const [user, setUser] = useState(undefined) // undefined = loading

  useEffect(() => {
    return onAuthStateChanged(auth, setUser)
  }, [])

  const login = () => signInWithPopup(auth, googleProvider)
  const logout = () => signOut(auth)

  return { user, login, logout }
}
