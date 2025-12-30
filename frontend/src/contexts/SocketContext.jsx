import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const SocketContext = createContext(null)

// URL del servidor Socket.IO - producción o desarrollo
const SOCKET_URL = import.meta.env.PROD 
  ? 'https://emilia-cafe-backend-production.up.railway.app'
  : window.location.origin

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth()
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    const token = localStorage.getItem('accessToken')
    if (!token) return

    // Crear conexión Socket.IO
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    // Eventos de conexión
    newSocket.on('connect', () => {
      console.log('Socket conectado')
      setIsConnected(true)
    })

    newSocket.on('connected', (data) => {
      console.log('Conexión confirmada:', data)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('Socket desconectado:', reason)
      setIsConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.error('Error de conexión:', error.message)
      setIsConnected(false)
    })

    // Eventos de actualización en tiempo real
    newSocket.on('inventory:update', (data) => {
      console.log('Actualización de inventario:', data)
      setLastUpdate({ type: 'inventory', data, timestamp: Date.now() })
    })

    newSocket.on('menu:update', (data) => {
      console.log('Actualización de menú:', data)
      setLastUpdate({ type: 'menu', data, timestamp: Date.now() })
    })

    newSocket.on('menu:availability', (data) => {
      console.log('Cambio de disponibilidad:', data)
      setLastUpdate({ type: 'menu:availability', data, timestamp: Date.now() })
    })

    newSocket.on('order:new', (data) => {
      console.log('Nueva orden:', data)
      setLastUpdate({ type: 'order:new', data, timestamp: Date.now() })
      if (user?.rol === 'gerente') {
        toast.success(`Nueva orden: ${data.codigo}`, { icon: '🍽️' })
      }
    })

    newSocket.on('order:status', (data) => {
      console.log('Estado de orden actualizado:', data)
      setLastUpdate({ type: 'order:status', data, timestamp: Date.now() })
      
      // Notificar al mesero cuando su orden está lista
      if (data.estado === 'lista' && user?.rol === 'empleado' && data.mesero_id === user?.id) {
        // Reproducir sonido
        try {
          const audio = new Audio('/sounds/notification.mp3')
          audio.volume = 0.8
          audio.play().catch(() => {})
        } catch (e) {}
        
        // Vibrar dispositivo móvil
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200, 100, 200]) // Patrón de vibración
        }
        
        // Mostrar notificación del navegador
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('¡Orden Lista! 🍽️', {
            body: `Orden ${data.codigo} - Mesa ${data.mesa_numero || 'S/N'} está lista para servir`,
            icon: '/favicon.ico',
            tag: `order-${data.orderId}`,
            requireInteraction: true,
            vibrate: [200, 100, 200],
          })
        }
        
        // Toast siempre visible
        toast.success(
          `¡Orden ${data.codigo} lista!\nMesa ${data.mesa_numero || 'S/N'}`,
          { 
            icon: '🔔',
            duration: 10000,
            style: { fontWeight: 'bold', fontSize: '16px' }
          }
        )
      }
    })

    newSocket.on('alert:new', (data) => {
      console.log('Nueva alerta:', data)
      setLastUpdate({ type: 'alert', data, timestamp: Date.now() })
      
      if (data.tipo === 'stock_bajo') {
        toast.error(`Stock bajo: ${data.ingrediente}`, { icon: '⚠️' })
      }
    })

    newSocket.on('table:update', (data) => {
      console.log('Mesa actualizada:', data)
      setLastUpdate({ type: 'table', data, timestamp: Date.now() })
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [isAuthenticated, user?.rol])

  // Función para suscribirse a una mesa
  const subscribeToTable = useCallback((tableId) => {
    if (socket) {
      socket.emit('subscribe:table', tableId)
    }
  }, [socket])

  // Función para desuscribirse de una mesa
  const unsubscribeFromTable = useCallback((tableId) => {
    if (socket) {
      socket.emit('unsubscribe:table', tableId)
    }
  }, [socket])

  // Función para suscribirse a una orden
  const subscribeToOrder = useCallback((orderId) => {
    if (socket) {
      socket.emit('subscribe:order', orderId)
    }
  }, [socket])

  // Marcar alerta como leída
  const markAlertAsRead = useCallback((alertId) => {
    if (socket) {
      socket.emit('alert:read', alertId)
    }
  }, [socket])

  const value = {
    socket,
    isConnected,
    lastUpdate,
    subscribeToTable,
    unsubscribeFromTable,
    subscribeToOrder,
    markAlertAsRead,
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket debe usarse dentro de SocketProvider')
  }
  return context
}
