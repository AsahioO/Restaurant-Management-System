import { useState, useEffect } from 'react'
import { ordersAPI } from '../services/api'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import { 
  Search, 
  Filter,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  ChefHat,
  Utensils,
  CreditCard,
  RefreshCw,
  Check,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'yellow', icon: Clock },
  confirmada: { label: 'Confirmada', color: 'orange', icon: CheckCircle },
  en_preparacion: { label: 'En preparación', color: 'blue', icon: ChefHat },
  lista: { label: 'Lista', color: 'purple', icon: Utensils },
  servida: { label: 'Servida', color: 'indigo', icon: Utensils },
  cobrada: { label: 'Cobrada', color: 'green', icon: CreditCard },
  cancelada: { label: 'Cancelada', color: 'red', icon: XCircle },
}

export default function Orders() {
  const { isGerente } = useAuth()
  const { lastUpdate } = useSocket()
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const fetchOrders = async () => {
    try {
      const params = statusFilter ? { estado: statusFilter } : {}
      const response = await ordersAPI.getAll(params)
      setOrders(response.data.data.orders)
    } catch (error) {
      console.error('Error cargando órdenes:', error)
      toast.error('Error al cargar órdenes')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [statusFilter])

  // Actualizar en tiempo real
  useEffect(() => {
    if (lastUpdate?.type === 'order:new' || lastUpdate?.type === 'order:status') {
      fetchOrders()
    }
  }, [lastUpdate])

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await ordersAPI.updateStatus(orderId, newStatus)
      toast.success('Estado actualizado')
      fetchOrders()
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, estado: newStatus }))
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Error al actualizar estado'
      toast.error(message)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value)
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-10 h-10 border-4 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Órdenes</h1>
          <p className="text-gray-500">{orders.length} órdenes encontradas</p>
        </div>

        <button 
          onClick={fetchOrders}
          className="btn-secondary"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Actualizar
        </button>
      </div>

      {/* Filtros de estado */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={clsx(
            'px-4 py-2 rounded-full text-sm font-medium transition-colors',
            !statusFilter 
              ? 'bg-primary-700 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          Todas
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={clsx(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              statusFilter === key
                ? 'bg-primary-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* Lista de órdenes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            formatCurrency={formatCurrency}
            formatTime={formatTime}
            onStatusChange={handleStatusChange}
            onViewDetails={() => setSelectedOrder(order)}
            isGerente={isGerente}
          />
        ))}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No hay órdenes</p>
        </div>
      )}

      {/* Modal de detalle */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          formatCurrency={formatCurrency}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}

function OrderCard({ order, formatCurrency, formatTime, onStatusChange, onViewDetails, isGerente }) {
  const statusConfig = STATUS_CONFIG[order.estado]
  const StatusIcon = statusConfig.icon

  const colorClasses = {
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    red: 'bg-red-100 text-red-800 border-red-200',
  }

  const nextStatus = {
    pendiente: 'confirmada',
    confirmada: 'en_preparacion',
    en_preparacion: 'lista',
    lista: 'servida',
    servida: 'cobrada',
  }

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="card-body">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg text-gray-900">{order.codigo}</h3>
            <p className="text-sm text-gray-500">
              Mesa {order.mesa_numero || 'Sin mesa'} • {formatTime(order.created_at)}
            </p>
          </div>
          <span className={clsx(
            'px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1',
            colorClasses[statusConfig.color]
          )}>
            <StatusIcon className="w-3.5 h-3.5" />
            {statusConfig.label}
          </span>
        </div>

        {/* Ítems */}
        <div className="space-y-2 mb-4">
          {order.items?.slice(0, 3).map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {item.cantidad}x {item.nombre_item}
              </span>
              <span className="text-gray-900">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
          {order.items?.length > 3 && (
            <p className="text-xs text-gray-400">
              +{order.items.length - 3} más...
            </p>
          )}
        </div>

        {/* Total */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <span className="font-medium text-gray-600">Total</span>
          <span className="text-xl font-bold text-gray-900">
            {formatCurrency(order.total)}
          </span>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onViewDetails}
            className="btn-ghost btn-sm flex-1"
          >
            <Eye className="w-4 h-4 mr-1" />
            Detalles
          </button>
          
          {/* Botón para que mesero confirme que sirvió la orden */}
          {order.estado === 'lista' && (
            <button
              onClick={() => onStatusChange(order.id, 'servida')}
              className="btn-sm flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center justify-center gap-1"
            >
              <Check className="w-4 h-4" />
              Servida
            </button>
          )}
          
          {isGerente && nextStatus[order.estado] && (
            <button
              onClick={() => onStatusChange(order.id, nextStatus[order.estado])}
              className="btn-primary btn-sm flex-1"
            >
              Avanzar
            </button>
          )}
          
          {isGerente && order.estado !== 'cancelada' && order.estado !== 'cobrada' && (
            <button
              onClick={() => onStatusChange(order.id, 'cancelada')}
              className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function OrderDetailModal({ order, onClose, formatCurrency, onStatusChange }) {
  const statusConfig = STATUS_CONFIG[order.estado]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-slide-up">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{order.codigo}</h2>
              <p className="text-sm text-gray-500">
                Mesa {order.mesa_numero || 'Sin mesa'} • {order.mesero_nombre}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <XCircle className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Estado actual */}
          <div className="mb-6">
            <label className="label">Estado</label>
            <select
              value={order.estado}
              onChange={(e) => onStatusChange(order.id, e.target.value)}
              className="input"
              disabled={order.estado === 'cobrada' || order.estado === 'cancelada'}
            >
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Ítems */}
          <div className="mb-6">
            <label className="label">Productos</label>
            <div className="space-y-3">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.cantidad}x {item.nombre_item}
                    </p>
                    {item.notas && (
                      <p className="text-xs text-gray-500 mt-1">📝 {item.notas}</p>
                    )}
                  </div>
                  <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notas */}
          {order.notas && (
            <div className="mb-6">
              <label className="label">Notas</label>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{order.notas}</p>
            </div>
          )}
        </div>

        {/* Footer con totales */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">IVA (16%)</span>
              <span>{formatCurrency(order.impuestos)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
