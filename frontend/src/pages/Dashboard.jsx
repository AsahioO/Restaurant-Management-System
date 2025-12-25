import { useState, useEffect } from 'react'
import { dashboardAPI } from '../services/api'
import { useSocket } from '../contexts/SocketContext'
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  Package,
  Users,
  Coffee,
  Clock,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import clsx from 'clsx'

const COLORS = ['#8b6f63', '#ed771b', '#10b981', '#6366f1', '#f59e0b', '#ef4444']

export default function Dashboard() {
  const { lastUpdate } = useSocket()
  const [kpis, setKpis] = useState(null)
  const [salesByHour, setSalesByHour] = useState([])
  const [salesByDay, setSalesByDay] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [kpisRes, hourRes, dayRes] = await Promise.all([
        dashboardAPI.getKPIs(),
        dashboardAPI.getSalesByHour(),
        dashboardAPI.getSalesByDay(14),
      ])

      setKpis(kpisRes.data.data)
      setSalesByHour(hourRes.data.data.data.filter(h => h.hora >= 7 && h.hora <= 22))
      setSalesByDay(dayRes.data.data.data)
    } catch (error) {
      console.error('Error cargando dashboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Recargar en actualizaciones relevantes
  useEffect(() => {
    if (lastUpdate?.type === 'order:new' || lastUpdate?.type === 'inventory') {
      fetchData()
    }
  }, [lastUpdate])

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
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Resumen de operaciones de hoy</p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Ventas del día"
          value={formatCurrency(kpis?.hoy?.ventas || 0)}
          subtitle={`${kpis?.hoy?.ordenes || 0} órdenes`}
          icon={DollarSign}
          color="green"
        />
        <KPICard
          title="Ticket promedio"
          value={formatCurrency(kpis?.ventas?.ticketPromedio || 0)}
          subtitle="Por orden"
          icon={TrendingUp}
          color="blue"
        />
        <KPICard
          title="Mesas ocupadas"
          value={`${kpis?.mesas?.ocupadas || 0} / ${kpis?.mesas?.total || 0}`}
          subtitle={`${kpis?.mesas?.disponibles || 0} disponibles`}
          icon={Coffee}
          color="orange"
        />
        <KPICard
          title="Alertas de stock"
          value={kpis?.alertas?.stockBajo || 0}
          subtitle={`${kpis?.alertas?.agotados || 0} agotados`}
          icon={AlertTriangle}
          color={kpis?.alertas?.stockBajo > 0 ? 'red' : 'gray'}
        />
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas por hora */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Ventas por hora (hoy)
            </h2>
          </div>
          <div className="card-body">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="horaFormato" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'Ventas']}
                    contentStyle={{ 
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                    }}
                  />
                  <Bar 
                    dataKey="ventas" 
                    fill="#8b6f63" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Ventas últimos días */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-400" />
              Ventas últimos 14 días
            </h2>
          </div>
          <div className="card-body">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="fecha" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return `${date.getDate()}/${date.getMonth() + 1}`
                    }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'Ventas']}
                    labelFormatter={(value) => new Date(value).toLocaleDateString('es-MX')}
                    contentStyle={{ 
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ventas" 
                    stroke="#ed771b" 
                    strokeWidth={2}
                    dot={{ fill: '#ed771b', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Tablas de datos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ítems más vendidos */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-gray-400" />
              Productos más vendidos
            </h2>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="text-right">Cantidad</th>
                    <th className="text-right">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis?.itemsMasVendidos?.slice(0, 5).map((item, index) => (
                    <tr key={index}>
                      <td className="font-medium">{item.nombre_item}</td>
                      <td className="text-right">{item.cantidad_vendida}</td>
                      <td className="text-right">{formatCurrency(item.ingresos)}</td>
                    </tr>
                  ))}
                  {(!kpis?.itemsMasVendidos || kpis.itemsMasVendidos.length === 0) && (
                    <tr>
                      <td colSpan={3} className="text-center text-gray-500 py-8">
                        Sin datos disponibles
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Ventas por categoría */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-400" />
              Ventas por categoría
            </h2>
          </div>
          <div className="card-body">
            {kpis?.ventasPorCategoria?.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={kpis.ventasPorCategoria}
                      dataKey="ingresos"
                      nameKey="categoria"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ categoria, percent }) => 
                        `${categoria} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {kpis.ventasPorCategoria.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ 
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Sin datos disponibles
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estados de órdenes */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">Estado de órdenes del día</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {Object.entries(kpis?.ordenesPorEstado || {}).map(([estado, cantidad]) => (
              <div key={estado} className="text-center p-3 bg-gray-50 rounded-lg">
                <span className={clsx(
                  'inline-block px-2 py-1 rounded-full text-xs font-medium mb-2',
                  estado === 'cobrada' && 'bg-green-100 text-green-800',
                  estado === 'pendiente' && 'bg-yellow-100 text-yellow-800',
                  estado === 'en_preparacion' && 'bg-blue-100 text-blue-800',
                  estado === 'lista' && 'bg-purple-100 text-purple-800',
                  estado === 'servida' && 'bg-indigo-100 text-indigo-800',
                  estado === 'cancelada' && 'bg-red-100 text-red-800',
                  estado === 'confirmada' && 'bg-orange-100 text-orange-800',
                )}>
                  {estado.replace('_', ' ')}
                </span>
                <p className="text-2xl font-bold text-gray-900">{cantidad}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function KPICard({ title, value, subtitle, icon: Icon, color }) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-50 text-gray-600',
  }

  return (
    <div className="card">
      <div className="card-body flex items-center gap-4">
        <div className={clsx('p-3 rounded-lg', colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}
