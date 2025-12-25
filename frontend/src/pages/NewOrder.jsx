import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { menuAPI, ordersAPI } from '../services/api'
import { useSocket } from '../contexts/SocketContext'
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2,
  ShoppingCart,
  Check,
  AlertCircle,
  X,
  MessageSquare,
  Loader2,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function NewOrder() {
  const navigate = useNavigate()
  const { lastUpdate } = useSocket()
  const [menu, setMenu] = useState({ items: [], byCategory: [] })
  const [categories, setCategories] = useState([])
  const [tables, setTables] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [orderNotes, setOrderNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = async () => {
    try {
      const [menuRes, catRes, tablesRes] = await Promise.all([
        menuAPI.getAll({ disponible: 'true' }),
        menuAPI.getCategories(),
        ordersAPI.getTables(),
      ])
      setMenu(menuRes.data.data)
      setCategories(catRes.data.data)
      setTables(tablesRes.data.data)
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Actualizar disponibilidad en tiempo real
  useEffect(() => {
    if (lastUpdate?.type === 'menu:availability') {
      fetchData()
    }
  }, [lastUpdate])

  // Filtrar ítems disponibles
  const filteredItems = useMemo(() => {
    return menu.items.filter(item => {
      const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = !selectedCategory || item.categoria_id === selectedCategory
      return matchesSearch && matchesCategory && item.disponible_real
    })
  }, [menu.items, searchTerm, selectedCategory])

  // Agregar al carrito
  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.menu_item_id === item.id)
      if (existing) {
        return prev.map(i => 
          i.menu_item_id === item.id 
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        )
      }
      return [...prev, {
        menu_item_id: item.id,
        nombre: item.nombre,
        precio: item.precio,
        cantidad: 1,
        notas: '',
      }]
    })
    toast.success(`${item.nombre} agregado`, { duration: 1000 })
  }

  // Actualizar cantidad
  const updateQuantity = (itemId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.menu_item_id === itemId) {
          const newQty = item.cantidad + delta
          if (newQty <= 0) return null
          return { ...item, cantidad: newQty }
        }
        return item
      }).filter(Boolean)
    })
  }

  // Actualizar notas de ítem
  const updateItemNotes = (itemId, notas) => {
    setCart(prev => {
      return prev.map(item => 
        item.menu_item_id === itemId 
          ? { ...item, notas }
          : item
      )
    })
  }

  // Remover del carrito
  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(item => item.menu_item_id !== itemId))
  }

  // Calcular totales
  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)
    const impuestos = subtotal * 0.16
    const total = subtotal + impuestos
    return { subtotal, impuestos, total }
  }, [cart])

  // Enviar orden
  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.error('Agrega al menos un producto')
      return
    }

    setIsSubmitting(true)
    
    try {
      const orderData = {
        mesa_id: selectedTable,
        notas: orderNotes,
        items: cart.map(item => ({
          menu_item_id: item.menu_item_id,
          cantidad: item.cantidad,
          notas: item.notas,
        })),
      }

      const response = await ordersAPI.create(orderData)
      const { order } = response.data.data

      toast.success(`Orden ${order.codigo} creada exitosamente`)
      
      // Limpiar y redirigir
      setCart([])
      setSelectedTable(null)
      setOrderNotes('')
      navigate('/orders')
    } catch (error) {
      const message = error.response?.data?.message || 'Error al crear la orden'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-10 h-10 border-4 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fade-in">
      {/* Panel de menú */}
      <div className="flex-1 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Nueva Orden</h1>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Categorías */}
        <div className="flex flex-wrap gap-2 pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={clsx(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              !selectedCategory 
                ? 'bg-primary-700 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={clsx(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                selectedCategory === cat.id
                  ? 'bg-primary-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {cat.icono} {cat.nombre}
            </button>
          ))}
        </div>

        {/* Grid de productos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredItems.map(item => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              className="card text-left p-4 hover:shadow-md hover:border-primary-300 transition-all active:scale-95"
            >
              <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">
                {item.nombre}
              </h3>
              <p className="text-primary-700 font-bold">
                {formatCurrency(item.precio)}
              </p>
              {item.max_porciones !== null && item.max_porciones < 10 && (
                <p className="text-xs text-orange-600 mt-1">
                  Quedan {item.max_porciones}
                </p>
              )}
            </button>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay productos disponibles</p>
          </div>
        )}
      </div>

      {/* Carrito */}
      <div className="w-full lg:w-96 lg:sticky lg:top-20 lg:self-start">
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Orden actual
              {cart.length > 0 && (
                <span className="badge bg-primary-100 text-primary-700">
                  {cart.reduce((sum, item) => sum + item.cantidad, 0)} items
                </span>
              )}
            </h2>
          </div>

          <div className="card-body space-y-4">
            {/* Selector de mesa */}
            <div>
              <label className="label">Mesa (opcional)</label>
              <select
                value={selectedTable || ''}
                onChange={(e) => setSelectedTable(e.target.value ? parseInt(e.target.value) : null)}
                className="input"
              >
                <option value="">Sin mesa</option>
                {tables.filter(t => t.estado === 'disponible').map(table => (
                  <option key={table.id} value={table.id}>
                    Mesa {table.numero} ({table.ubicacion})
                  </option>
                ))}
              </select>
            </div>

            {/* Items del carrito */}
            {cart.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Agrega productos</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {cart.map(item => (
                  <CartItem
                    key={item.menu_item_id}
                    item={item}
                    formatCurrency={formatCurrency}
                    onUpdateQuantity={updateQuantity}
                    onUpdateNotes={updateItemNotes}
                    onRemove={removeFromCart}
                  />
                ))}
              </div>
            )}

            {/* Notas generales */}
            <div>
              <label className="label">Notas de la orden</label>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Instrucciones especiales..."
                className="input resize-none"
                rows={2}
              />
            </div>

            {/* Totales */}
            {cart.length > 0 && (
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">IVA (16%)</span>
                  <span>{formatCurrency(totals.impuestos)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            )}

            {/* Botón de enviar */}
            <button
              onClick={submitOrder}
              disabled={cart.length === 0 || isSubmitting}
              className="btn-accent w-full py-3"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Enviar orden
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CartItem({ item, formatCurrency, onUpdateQuantity, onUpdateNotes, onRemove }) {
  const [showNotes, setShowNotes] = useState(false)

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 text-sm truncate">
            {item.nombre}
          </h4>
          <p className="text-sm text-gray-500">
            {formatCurrency(item.precio)} c/u
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateQuantity(item.menu_item_id, -1)}
            className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-6 text-center font-medium">{item.cantidad}</span>
          <button
            onClick={() => onUpdateQuantity(item.menu_item_id, 1)}
            className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center hover:bg-primary-200"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {item.notas ? 'Editar nota' : 'Agregar nota'}
        </button>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {formatCurrency(item.precio * item.cantidad)}
          </span>
          <button
            onClick={() => onRemove(item.menu_item_id)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showNotes && (
        <div className="mt-2">
          <input
            type="text"
            value={item.notas}
            onChange={(e) => onUpdateNotes(item.menu_item_id, e.target.value)}
            placeholder="Ej: sin cebolla, extra caliente..."
            className="input text-sm py-1.5"
          />
        </div>
      )}
    </div>
  )
}
