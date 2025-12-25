import { useState, useEffect } from 'react'
import { menuAPI } from '../services/api'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2,
  AlertCircle,
  Check,
  X,
  Clock,
  DollarSign,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function Menu() {
  const { isGerente } = useAuth()
  const { lastUpdate } = useSocket()
  const [menu, setMenu] = useState({ items: [], byCategory: [] })
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showUnavailable, setShowUnavailable] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [editingItem, setEditingItem] = useState(null)

  const fetchMenu = async () => {
    try {
      const [menuRes, catRes] = await Promise.all([
        menuAPI.getAll({ includeInactive: isGerente ? 'true' : 'false' }),
        menuAPI.getCategories(),
      ])
      setMenu(menuRes.data.data)
      setCategories(catRes.data.data)
    } catch (error) {
      console.error('Error cargando menú:', error)
      toast.error('Error al cargar el menú')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMenu()
  }, [isGerente])

  // Recargar en actualizaciones
  useEffect(() => {
    if (lastUpdate?.type === 'menu:update' || lastUpdate?.type === 'menu:availability') {
      fetchMenu()
    }
  }, [lastUpdate])

  // Filtrar ítems
  const filteredItems = menu.items.filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || item.categoria_id === selectedCategory
    const matchesAvailability = showUnavailable || item.disponible_real
    
    return matchesSearch && matchesCategory && matchesAvailability
  })

  // Agrupar por categoría
  const groupedItems = categories
    .filter(cat => !selectedCategory || cat.id === selectedCategory)
    .map(cat => ({
      ...cat,
      items: filteredItems.filter(item => item.categoria_id === cat.id),
    }))
    .filter(cat => cat.items.length > 0)

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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menú</h1>
          <p className="text-gray-500">
            {menu.disponibles} disponibles • {menu.noDisponibles} no disponibles
          </p>
        </div>
        
        {isGerente && (
          <button className="btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo ítem
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Filtro de categoría */}
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
              className="input w-full sm:w-48"
            >
              <option value="">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icono} {cat.nombre}
                </option>
              ))}
            </select>

            {/* Toggle disponibilidad */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnavailable}
                onChange={(e) => setShowUnavailable(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">Mostrar no disponibles</span>
            </label>
          </div>
        </div>
      </div>

      {/* Lista de productos */}
      <div className="space-y-8">
        {groupedItems.map(category => (
          <div key={category.id}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">{category.icono}</span>
              {category.nombre}
              <span className="text-sm font-normal text-gray-400">
                ({category.items.length})
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.items.map(item => (
                <MenuItemCard 
                  key={item.id} 
                  item={item} 
                  isGerente={isGerente}
                  formatCurrency={formatCurrency}
                  onEdit={() => setEditingItem(item)}
                />
              ))}
            </div>
          </div>
        ))}

        {groupedItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No se encontraron productos</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MenuItemCard({ item, isGerente, formatCurrency, onEdit }) {
  const isAvailable = item.disponible_real

  return (
    <div className={clsx(
      'card border-2 transition-all hover:shadow-md',
      isAvailable ? 'menu-item-available' : 'menu-item-unavailable'
    )}>
      <div className="card-body">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              {item.nombre}
              {item.destacado && (
                <span className="badge bg-accent-100 text-accent-700">
                  ⭐ Destacado
                </span>
              )}
            </h3>
            {item.descripcion && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {item.descripcion}
              </p>
            )}
          </div>
          
          {/* Estado de disponibilidad */}
          <div className={clsx(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
            isAvailable 
              ? 'bg-green-100 text-green-600' 
              : 'bg-red-100 text-red-600'
          )}>
            {isAvailable ? (
              <Check className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
          </div>
        </div>

        {/* Info adicional */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            {formatCurrency(item.precio)}
          </span>
          {item.tiempo_preparacion > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {item.tiempo_preparacion} min
            </span>
          )}
        </div>

        {/* Razón de no disponibilidad */}
        {!isAvailable && item.ingredientes_faltantes?.length > 0 && (
          <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg text-xs text-red-700 mb-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">Falta:</span>{' '}
              {item.ingredientes_faltantes.map(i => i.name).join(', ')}
            </div>
          </div>
        )}

        {/* Porciones disponibles */}
        {isAvailable && item.max_porciones !== null && (
          <div className="text-xs text-gray-500">
            Disponible: {item.max_porciones} porciones
          </div>
        )}

        {/* Acciones (solo gerente) */}
        {isGerente && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            <button 
              onClick={onEdit}
              className="btn-ghost btn-sm flex-1"
            >
              <Edit className="w-4 h-4 mr-1" />
              Editar
            </button>
            <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
