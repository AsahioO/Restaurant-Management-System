import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Bell, BellOff, X } from 'lucide-react'
import { subscribeToPush, isPushSupported } from '../services/pushService'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function NotificationPermission() {
  const { user } = useAuth()
  const [permission, setPermission] = useState('default')
  const [showBanner, setShowBanner] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)

  useEffect(() => {
    // Mostrar para empleados (meseros) y cocina
    if (!user || (user.rol !== 'empleado' && user.rol !== 'cocina')) return
    
    if ('Notification' in window) {
      setPermission(Notification.permission)
      
      // Si ya tiene permiso, intentar suscribir silenciosamente
      if (Notification.permission === 'granted') {
        subscribeToPush().catch(console.error)
      }
      
      // Mostrar banner si no ha decidido
      if (Notification.permission === 'default') {
        // Esperar un poco antes de mostrar
        const timer = setTimeout(() => setShowBanner(true), 2000)
        return () => clearTimeout(timer)
      }
    }
  }, [user?.rol, user?.id])

  const requestPermission = async () => {
    if ('Notification' in window) {
      setIsSubscribing(true)
      
      try {
        const result = await Notification.requestPermission()
        setPermission(result)
        
        if (result === 'granted') {
          // Suscribir a push notifications
          if (isPushSupported()) {
            await subscribeToPush()
            toast.success('¡Notificaciones push activadas!')
          }
          
          // Mostrar notificación de prueba
          new Notification('¡Notificaciones activadas! 🔔', {
            body: 'Recibirás alertas cuando tus órdenes estén listas',
            icon: '/icons/icon-192x192.svg',
          })
        }
      } catch (error) {
        console.error('Error activando notificaciones:', error)
        toast.error('Error activando notificaciones')
      } finally {
        setIsSubscribing(false)
        setShowBanner(false)
      }
    }
  }

  const dismissBanner = () => {
    setShowBanner(false)
  }

  if (!showBanner || !user || (user.rol !== 'empleado' && user.rol !== 'cocina')) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Bell className="w-6 h-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              Activar notificaciones
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Recibe alertas cuando tus órdenes estén listas, <strong>incluso con la app cerrada</strong>.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={requestPermission}
                disabled={isSubscribing}
                className="btn-primary btn-sm"
              >
                {isSubscribing ? 'Activando...' : 'Activar'}
              </button>
              <button
                onClick={dismissBanner}
                className="btn-ghost btn-sm"
              >
                Ahora no
              </button>
            </div>
          </div>
          <button
            onClick={dismissBanner}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Componente indicador de estado de notificaciones (para el header)
export function NotificationStatus() {
  const { user } = useAuth()
  const [permission, setPermission] = useState('default')
  const [isSubscribing, setIsSubscribing] = useState(false)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const handleClick = async () => {
    if (permission === 'granted') {
      // Ya tiene permisos, mostrar tooltip o no hacer nada
      return
    }

    setIsSubscribing(true)
    try {
      if ('Notification' in window) {
        const result = await Notification.requestPermission()
        setPermission(result)
        
        if (result === 'granted' && isPushSupported()) {
          await subscribeToPush()
          toast.success('¡Notificaciones activadas!')
        }
      }
    } catch (error) {
      console.error('Error activando notificaciones:', error)
      toast.error('Error activando notificaciones')
    } finally {
      setIsSubscribing(false)
    }
  }

  // Mostrar para empleados y cocina
  if (!user || (user.rol !== 'empleado' && user.rol !== 'cocina')) return null

  return (
    <button
      onClick={handleClick}
      disabled={isSubscribing || permission === 'granted'}
      className={clsx(
        'relative p-2 rounded-full transition-colors',
        permission === 'granted'
          ? 'text-green-600 bg-green-50 cursor-default'
          : permission === 'denied'
          ? 'text-red-500 bg-red-50 cursor-not-allowed'
          : 'text-gray-500 hover:bg-gray-100 hover:text-primary-600'
      )}
      title={
        permission === 'granted'
          ? 'Notificaciones activadas'
          : permission === 'denied'
          ? 'Notificaciones bloqueadas en el navegador'
          : 'Activar notificaciones push'
      }
    >
      {isSubscribing ? (
        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      ) : permission === 'granted' ? (
        <Bell className="w-5 h-5" />
      ) : (
        <BellOff className="w-5 h-5" />
      )}
      {/* Indicador de estado */}
      {permission === 'granted' && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
      )}
      {permission === 'default' && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-500 rounded-full border-2 border-white animate-pulse" />
      )}
    </button>
  )
}
