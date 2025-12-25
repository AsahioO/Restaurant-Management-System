import { useState, useEffect } from 'react'
import { inventoryAPI } from '../services/api'
import { useSocket } from '../contexts/SocketContext'
import { 
  Search, 
  Plus, 
  Edit, 
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  History,
  X,
  Loader2,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function Inventory() {
  const { lastUpdate } = useSocket()
  const [ingredients, setIngredients] = useState([])
  const [alerts, setAlerts] = useState({ alerts: [], agotados: 0, stock_bajo: 0 })
  const [searchTerm, setSearchTerm] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [adjustingItem, setAdjustingItem] = useState(null)
  const [movements, setMovements] = useState([])
  const [showMovements, setShowMovements] = useState(false)

  const fetchData = async () => {
    try {
      const [ingredientsRes, alertsRes] = await Promise.all([
        inventoryAPI.getAll({ low_stock: showLowStock ? 'true' : undefined }),
        inventoryAPI.getAlerts(),
      ])
      setIngredients(ingredientsRes.data.data.ingredients)
      setAlerts(alertsRes.data.data)
    } catch (error) {
      console.error('Error cargando inventario:', error)
      toast.error('Error al cargar inventario')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [showLowStock])

  // Actualizar en tiempo real
  useEffect(() => {
    if (lastUpdate?.type === 'inventory:update') {
      fetchData()
    }
  }, [lastUpdate])

  const fetchMovements = async () => {
    try {
      const response = await inventoryAPI.getMovements({ limit: 50 })
      setMovements(response.data.data.movements)
      setShowMovements(true)
    } catch (error) {
      toast.error('Error al cargar movimientos')
    }
  }

  const handleAdjustStock = async (id, data) => {
    try {
      await inventoryAPI.adjustStock(id, data)
      toast.success('Stock actualizado')
      setAdjustingItem(null)
      fetchData()
    } catch (error) {
      const message = error.response?.data?.message || 'Error al ajustar stock'
      toast.error(message)
    }
  }

  const filteredIngredients = ingredients.filter(ing =>
    ing.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ing.ubicacion?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-500">{ingredients.length} ingredientes registrados</p>
        </div>

        <div className="flex gap-2">
          <button onClick={fetchMovements} className="btn-secondary">
            <History className="w-5 h-5 mr-2" />
            Movimientos
          </button>
          <button className="btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo ingrediente
          </button>
        </div>
      </div>

      {/* Alertas de stock */}
      {alerts.alerts.length > 0 && (
        <div className="card border-l-4 border-l-red-500">
          <div className="card-body">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">
                  Alertas de inventario
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {alerts.agotados} agotados • {alerts.stock_bajo} con stock bajo
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {alerts.alerts.slice(0, 5).map(alert => (
                    <span
                      key={alert.id}
                      className={clsx(
                        'badge',
                        alert.estado === 'agotado' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      )}
                    >
                      {alert.nombre}: {alert.stock_actual} {alert.unidad}
                    </span>
                  ))}
                  {alerts.alerts.length > 5 && (
                    <span className="text-sm text-gray-500">
                      +{alerts.alerts.length - 5} más
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar ingredientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showLowStock}
                onChange={(e) => setShowLowStock(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">Solo stock bajo</span>
            </label>
          </div>
        </div>
      </div>

      {/* Tabla de ingredientes */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Ingrediente</th>
                <th>Stock actual</th>
                <th>Mínimo</th>
                <th>Ubicación</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredIngredients.map(ingredient => (
                <tr key={ingredient.id}>
                  <td>
                    <div>
                      <p className="font-medium text-gray-900">{ingredient.nombre}</p>
                      {ingredient.proveedor && (
                        <p className="text-xs text-gray-500">{ingredient.proveedor}</p>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={clsx(
                      'font-medium',
                      ingredient.alerta_agotado && 'text-red-600',
                      ingredient.alerta_stock_bajo && !ingredient.alerta_agotado && 'text-yellow-600'
                    )}>
                      {ingredient.stock_actual} {ingredient.unidad}
                    </span>
                  </td>
                  <td className="text-gray-500">
                    {ingredient.stock_minimo} {ingredient.unidad}
                  </td>
                  <td className="text-gray-500">
                    {ingredient.ubicacion || '-'}
                  </td>
                  <td>
                    {ingredient.alerta_agotado ? (
                      <span className="badge-danger">Agotado</span>
                    ) : ingredient.alerta_stock_bajo ? (
                      <span className="badge-warning">Stock bajo</span>
                    ) : (
                      <span className="badge-success">Normal</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setAdjustingItem(ingredient)}
                        className="btn-ghost btn-sm"
                      >
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Ajustar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredIngredients.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No hay ingredientes</p>
          </div>
        )}
      </div>

      {/* Modal de ajuste de stock */}
      {adjustingItem && (
        <StockAdjustModal
          ingredient={adjustingItem}
          onClose={() => setAdjustingItem(null)}
          onSubmit={handleAdjustStock}
        />
      )}

      {/* Modal de movimientos */}
      {showMovements && (
        <MovementsModal
          movements={movements}
          onClose={() => setShowMovements(false)}
        />
      )}
    </div>
  )
}

function StockAdjustModal({ ingredient, onClose, onSubmit }) {
  const [tipo, setTipo] = useState('entrada')
  const [cantidad, setCantidad] = useState('')
  const [referencia, setReferencia] = useState('')
  const [notas, setNotas] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!cantidad || parseFloat(cantidad) <= 0) {
      toast.error('Ingresa una cantidad válida')
      return
    }

    setIsSubmitting(true)
    await onSubmit(ingredient.id, {
      tipo,
      cantidad: parseFloat(cantidad),
      referencia,
      notas,
    })
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full animate-slide-up">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Ajustar stock</h2>
              <p className="text-sm text-gray-500">{ingredient.nombre}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Stock actual</p>
            <p className="text-2xl font-bold text-gray-900">
              {ingredient.stock_actual} {ingredient.unidad}
            </p>
          </div>

          <div>
            <label className="label">Tipo de movimiento</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'entrada', label: 'Entrada', icon: TrendingUp, color: 'green' },
                { value: 'salida', label: 'Salida', icon: TrendingDown, color: 'red' },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTipo(option.value)}
                  className={clsx(
                    'p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-colors',
                    tipo === option.value
                      ? option.color === 'green'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <option.icon className="w-5 h-5" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Cantidad ({ingredient.unidad})</label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              min="0.001"
              step="0.001"
              className="input"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="label">Referencia / Motivo</label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="input"
              placeholder="Ej: Compra proveedor, Ajuste inventario..."
            />
          </div>

          <div>
            <label className="label">Notas adicionales</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="input resize-none"
              rows={2}
              placeholder="Opcional..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Guardar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MovementsModal({ movements, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden animate-slide-up">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Historial de movimientos</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          <table className="table">
            <thead className="sticky top-0">
              <tr>
                <th>Fecha</th>
                <th>Ingrediente</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Referencia</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {movements.map(mov => (
                <tr key={mov.id}>
                  <td className="text-sm">
                    {new Date(mov.created_at).toLocaleString('es-MX')}
                  </td>
                  <td className="font-medium">{mov.ingrediente_nombre}</td>
                  <td>
                    <span className={clsx(
                      'badge',
                      mov.tipo === 'entrada' && 'bg-green-100 text-green-800',
                      mov.tipo === 'salida' && 'bg-red-100 text-red-800',
                      mov.tipo === 'ajuste' && 'bg-blue-100 text-blue-800',
                      mov.tipo === 'merma' && 'bg-yellow-100 text-yellow-800',
                    )}>
                      {mov.tipo}
                    </span>
                  </td>
                  <td>
                    {mov.tipo === 'entrada' ? '+' : '-'}{mov.cantidad} {mov.unidad}
                  </td>
                  <td className="text-gray-500 text-sm">{mov.referencia || '-'}</td>
                  <td className="text-gray-500 text-sm">{mov.usuario_nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
