import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setToken, hasToken, clearToken } from '../api/client'

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(hasToken())
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get<{ setup_complete: boolean }>('/auth/check')
      .then((data) => setSetupComplete(data.setup_complete))
      .catch(() => setSetupComplete(false))
  }, [])

  const login = async (pin: string) => {
    const { token } = await api.post<{ token: string }>('/auth/login', { pin })
    setToken(token)
    setIsLoggedIn(true)
    navigate('/')
  }

  const setup = async (pin: string) => {
    const { token } = await api.post<{ token: string }>('/auth/setup', { pin })
    setToken(token)
    setIsLoggedIn(true)
    navigate('/')
  }

  const logout = () => {
    clearToken()
    setIsLoggedIn(false)
    navigate('/login')
  }

  return { isLoggedIn, setupComplete, login, setup, logout }
}
