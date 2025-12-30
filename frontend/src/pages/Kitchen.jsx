import { useState, useEffect, useCallback } from 'react'
import { ordersAPI } from '../services/api'
import { useSocket } from '../contexts/SocketContext'
import { 
  Clock, 
  ChefHat, 
  CheckCircle,
  Utensils,
  Coffee,
  Timer,
  AlertCircle,
  RefreshCw,
  Volume2,
  VolumeX,
  Bell,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

// Configuración de columnas del Kanban
const KANBAN_COLUMNS = [
  { 
    id: 'pendiente', 
    title: 'Pendientes', 
    icon: Clock, 
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    headerBg: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    statuses: ['pendiente', 'confirmada']
  },
  { 
    id: 'en_preparacion', 
    title: 'En Preparación', 
    icon: ChefHat, 
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    headerBg: 'bg-blue-100',
    textColor: 'text-blue-800',
    statuses: ['en_preparacion']
  },
  { 
    id: 'lista', 
    title: 'Listas', 
    icon: CheckCircle, 
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    headerBg: 'bg-green-100',
    textColor: 'text-green-800',
    statuses: ['lista']
  },
]

// Componente de tarjeta de orden
function OrderCard({ order, onStatusChange }) {
  const [isUpdating, setIsUpdating] = useState(false)
  
  const getTimeElapsed = (createdAt) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diff = Math.floor((now - created) / 60000) // minutos
    
    if (diff < 1) return 'Hace un momento'
    if (diff < 60) return `${diff} min`
    const hours = Math.floor(diff / 60)
    return `${hours}h ${diff % 60}min`
  }

  const getUrgencyColor = (createdAt) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diff = Math.floor((now - created) / 60000)
    
    if (diff > 30) return 'border-l-red-500 bg-red-50/50'
    if (diff > 15) return 'border-l-orange-500 bg-orange-50/50'
    return 'border-l-green-500'
  }

  const handleAdvanceStatus = async () => {
    setIsUpdating(true)
    let nextStatus = ''
    
    if (order.estado === 'pendiente') {
      nextStatus = 'en_preparacion'
    } else if (order.estado === 'confirmada') {
      nextStatus = 'en_preparacion'
    } else if (order.estado === 'en_preparacion') {
      nextStatus = 'lista'
    }
    
    if (nextStatus) {
      await onStatusChange(order.id, nextStatus)
    }
    setIsUpdating(false)
  }

  const getButtonConfig = () => {
    switch (order.estado) {
      case 'pendiente':
      case 'confirmada':
        return { label: 'Iniciar', icon: ChefHat, color: 'bg-blue-600 hover:bg-blue-700' }
      case 'en_preparacion':
        return { label: 'Listo', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700' }
      default:
        return null
    }
  }

  const buttonConfig = getButtonConfig()

  return (
    <div 
      className={clsx(
        'bg-white rounded-xl shadow-sm border-l-4 p-4 transition-all hover:shadow-md',
        getUrgencyColor(order.created_at)
      )}
    >
      {/* Header de la tarjeta */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-800">#{order.codigo}</span>
          {order.mesa_numero && (
            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
              Mesa {order.mesa_numero}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-gray-500 text-sm">
          <Timer className="w-4 h-4" />
          <span>{getTimeElapsed(order.created_at)}</span>
        </div>
      </div>

      {/* Items de la orden */}
      <div className="space-y-2 mb-4">
        {order.items?.map((item, index) => (
          <div 
            key={index} 
            className={clsx(
              'flex items-center justify-between p-2 rounded-lg',
              item.estado === 'listo' ? 'bg-green-50 line-through text-gray-400' : 'bg-gray-50'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary-600 bg-primary-100 px-2 py-0.5 rounded">
                {item.cantidad}x
              </span>
              <span className="font-medium text-gray-700">{item.producto_nombre}</span>
            </div>
            {item.notas && (
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                {item.notas}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Notas generales */}
      {order.notas && (
        <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-yellow-800">{order.notas}</p>
          </div>
        </div>
      )}

      {/* Botón de acción */}
      {buttonConfig && (
        <button
          onClick={handleAdvanceStatus}
          disabled={isUpdating}
          className={clsx(
            'w-full flex items-center justify-center gap-2 py-3 rounded-lg text-white font-semibold transition-all',
            buttonConfig.color,
            isUpdating && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isUpdating ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <buttonConfig.icon className="w-5 h-5" />
              {buttonConfig.label}
            </>
          )}
        </button>
      )}

      {/* Mensaje para órdenes listas */}
      {order.estado === 'lista' && (
        <div className="flex items-center justify-center gap-2 py-3 bg-green-100 rounded-lg text-green-700 font-medium">
          <Utensils className="w-5 h-5" />
          <span>Esperando mesero</span>
        </div>
      )}
    </div>
  )
}

// Componente de columna Kanban
function KanbanColumn({ column, orders, onStatusChange }) {
  const filteredOrders = orders.filter(order => column.statuses.includes(order.estado))
  
  return (
    <div className={clsx('flex flex-col h-full rounded-2xl', column.bgColor, column.borderColor, 'border-2')}>
      {/* Header de columna */}
      <div className={clsx('flex items-center justify-between px-4 py-3 rounded-t-xl', column.headerBg)}>
        <div className="flex items-center gap-2">
          <column.icon className={clsx('w-6 h-6', column.textColor)} />
          <h2 className={clsx('text-lg font-bold', column.textColor)}>{column.title}</h2>
        </div>
        <span className={clsx(
          'px-3 py-1 rounded-full text-sm font-bold',
          column.textColor,
          'bg-white/80'
        )}>
          {filteredOrders.length}
        </span>
      </div>

      {/* Contenido de columna */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <Coffee className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">Sin órdenes</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default function Kitchen() {
  const { socket, lastUpdate, isConnected } = useSocket()
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastOrderCount, setLastOrderCount] = useState(0)

  // Referencia al elemento de audio
  const bellAudioRef = useCallback(() => {
    // Crear o reutilizar elemento de audio
    let audio = document.getElementById('kitchen-bell-sound')
    if (!audio) {
      audio = new Audio('/sounds/bell.mp3')
      audio.id = 'kitchen-bell-sound'
      audio.preload = 'auto'
    }
    return audio
  }, [])

  // Función para reproducir sonido de campana desde archivo
  const playBellSound = useCallback(() => {
    if (!soundEnabled) return
    
    try {
      const audio = bellAudioRef()
      audio.currentTime = 0
      audio.volume = 0.7
      audio.play().catch(e => {
        console.log('No se pudo reproducir audio:', e.message)
      })
    } catch (e) {
      console.log('Error de audio:', e)
    }
  }, [soundEnabled, bellAudioRef])

  const fetchOrders = useCallback(async () => {
    try {
      const response = await ordersAPI.getAll({ 
        estado: 'pendiente,confirmada,en_preparacion,lista'
      })
      const newOrders = response.data.data.orders || []
      
      // Detectar nuevas órdenes pendientes
      const pendingOrders = newOrders.filter(o => 
        o.estado === 'pendiente' || o.estado === 'confirmada'
      )
      
      if (pendingOrders.length > lastOrderCount && lastOrderCount > 0) {
        playBellSound()
        toast('🔔 ¡Nueva orden en cocina!', {
          icon: '🛎️',
          duration: 5000,
          style: {
            borderRadius: '10px',
            background: '#1f2937',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 'bold',
          },
        })
      }
      
      setLastOrderCount(pendingOrders.length)
      setOrders(newOrders)
    } catch (error) {
      console.error('Error cargando órdenes:', error)
      toast.error('Error al cargar órdenes')
    } finally {
      setIsLoading(false)
    }
  }, [lastOrderCount, playBellSound])

  useEffect(() => {
    fetchOrders()
    // Refrescar cada 30 segundos como respaldo
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  // Escuchar eventos en tiempo real
  useEffect(() => {
    if (lastUpdate?.type === 'order:new' || 
        lastUpdate?.type === 'order:status' || 
        lastUpdate?.type === 'order:item_status') {
      fetchOrders()
    }
  }, [lastUpdate, fetchOrders])

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await ordersAPI.updateStatus(orderId, newStatus)
      toast.success(`Orden actualizada a: ${
        newStatus === 'en_preparacion' ? 'En preparación' :
        newStatus === 'lista' ? 'Lista' : newStatus
      }`)
      fetchOrders()
    } catch (error) {
      const message = error.response?.data?.message || 'Error al actualizar'
      toast.error(message)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <ChefHat className="w-16 h-16 text-primary-600 mx-auto mb-4 animate-bounce" />
          <p className="text-xl font-semibold text-gray-700">Cargando cocina...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col">
      {/* Header del monitor */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ChefHat className="w-8 h-8 text-primary-600" />
          <h1 className="text-2xl font-display font-bold text-gray-800">
            Monitor de Cocina
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Toggle de sonido */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
              soundEnabled 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            )}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-5 h-5" />
                <span className="hidden sm:inline">Sonido ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-5 h-5" />
                <span className="hidden sm:inline">Sonido OFF</span>
              </>
            )}
          </button>

          {/* Botón para probar sonido */}
          {soundEnabled && (
            <button
              onClick={playBellSound}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-medium hover:bg-yellow-200 transition-all"
              title="Probar sonido de campana"
            >
              <Bell className="w-5 h-5" />
              <span className="hidden sm:inline">Probar</span>
            </button>
          )}

          {/* Botón refrescar */}
          <button
            onClick={() => fetchOrders()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-lg font-medium hover:bg-primary-200 transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {/* Estado de conexión */}
          <div className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
            isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}>
            <span className={clsx(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            )}></span>
            {isConnected ? 'En vivo' : 'Desconectado'}
          </div>
        </div>
      </div>

      {/* Tablero Kanban */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {KANBAN_COLUMNS.map(column => (
          <KanbanColumn
            key={column.id}
            column={column}
            orders={orders}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      {/* Footer con estadísticas */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {KANBAN_COLUMNS.map(column => {
          const count = orders.filter(o => column.statuses.includes(o.estado)).length
          return (
            <div 
              key={column.id}
              className={clsx(
                'flex items-center justify-center gap-3 p-4 rounded-xl',
                column.headerBg
              )}
            >
              <column.icon className={clsx('w-6 h-6', column.textColor)} />
              <span className={clsx('text-2xl font-bold', column.textColor)}>{count}</span>
              <span className={clsx('font-medium', column.textColor)}>{column.title}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
