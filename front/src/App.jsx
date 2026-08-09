import { useAuth } from './hooks/useAuth'
import { AppProvider } from './contexts/AppContext'
import Login from './components/Login'
import MainScreen from './components/MainScreen'

function Inner() {
  const { user, login, logout } = useAuth()

  if (user === undefined) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <Login onLogin={login} />

  return <MainScreen user={user} onLogout={logout} />
}

export default function App() {
  return (
    <AppProvider>
      <Inner />
    </AppProvider>
  )
}
