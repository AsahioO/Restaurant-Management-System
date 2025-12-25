import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Verificar token al cargar
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken')
      
      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          const response = await api.get('/auth/profile')
          setUser(response.data.data)
        } catch (error) {
          // Token inválido, intentar refresh
          const refreshToken = localStorage.getItem('refreshToken')
          if (refreshToken) {
            try {
              const refreshResponse = await api.post('/auth/refresh', { refreshToken })
              const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data.data
              
              localStorage.setItem('accessToken', accessToken)
              localStorage.setItem('refreshToken', newRefreshToken)
              api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
              
              const profileResponse = await api.get('/auth/profile')
              setUser(profileResponse.data.data)
            } catch {
              // Refresh falló, limpiar
              localStorage.removeItem('accessToken')
              localStorage.removeItem('refreshToken')
              delete api.defaults.headers.common['Authorization']
            }
          }
        }
      }
      
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { user: userData, accessToken, refreshToken } = response.data.data
      
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      
      setUser(userData)
      toast.success(`¡Bienvenido, ${userData.nombre}!`)
      
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Error al iniciar sesión'
      toast.error(message)
      return { success: false, error: message }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      await api.post('/auth/logout', { refreshToken })
    } catch {
      // Ignorar errores de logout
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      delete api.defaults.headers.common['Authorization']
      setUser(null)
      toast.success('Sesión cerrada')
    }
  }, [])

  const updateProfile = useCallback((updates) => {
    setUser(prev => ({ ...prev, ...updates }))
  }, [])

  const hasPermission = useCallback((permission) => {
    if (!user?.permisos) return false
    return user.permisos.includes(permission)
  }, [user])

  const isGerente = user?.rol === 'gerente'
  const isEmpleado = user?.rol === 'empleado'

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isGerente,
    isEmpleado,
    login,
    logout,
    updateProfile,
    hasPermission,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
