import { useAuth } from './hooks/useAuth'
import Login from './components/Login'
import MainScreen from './components/MainScreen'

export default function App() {
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
