import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener('auth-expired', onExpired)
    if (localStorage.getItem('token')) {
      api('/api/auth/me').then(setUser).catch(() => setUser(null)).finally(() => setReady(true))
    } else setReady(true)
    return () => window.removeEventListener('auth-expired', onExpired)
  }, [])

  const saveSession = (data) => { localStorage.setItem('token', data.access_token); setUser(data.user) }
  const login = async (username, password) => saveSession(await api('/api/auth/login', { method: 'POST', form: { username, password } }))
  const register = async (payload) => saveSession(await api('/api/auth/register', { method: 'POST', body: payload }))
  const logout = () => { localStorage.removeItem('token'); setUser(null) }

  return (
    <AuthContext.Provider value={{ user, setUser, ready, login, register, logout, isAdmin: user?.role_name === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
