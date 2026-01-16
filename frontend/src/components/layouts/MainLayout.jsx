import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useSocket } from '../../contexts/SocketContext'
import NotificationPermission, { NotificationStatus } from '../NotificationPermission'
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  Package,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Wifi,
  WifiOff,
  ChevronDown,
  Coffee,
  PlusCircle,
  ChefHat,
} from 'lucide-react'
import clsx from 'clsx'

export default function MainLayout() {
  const { user, logout, isGerente } = useAuth()
  const { isConnected } = useSocket()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const isCocina = user?.rol === 'cocina'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navigation = [
    ...(isGerente ? [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ] : []),
    ...(isCocina ? [
      { name: 'Monitor Cocina', href: '/kitchen', icon: ChefHat },
    ] : []),
    ...(!isCocina ? [
      { name: 'Nueva Orden', href: '/orders/new', icon: PlusCircle },
    ] : []),
    { name: 'Órdenes', href: '/orders', icon: ClipboardList },
    { name: 'Menú', href: '/menu', icon: UtensilsCrossed },
    ...(isGerente ? [
      { name: 'Monitor Cocina', href: '/kitchen', icon: ChefHat },
      { name: 'Inventario', href: '/inventory', icon: Package },
      { name: 'Usuarios', href: '/users', icon: Users },
      { name: 'Configuración', href: '/settings', icon: Settings },
    ] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar móvil overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'sidebar',
        sidebarOpen && 'open'
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-primary-800">
            <Coffee className="w-8 h-8 text-accent-400" />
            <span className="font-display text-xl font-bold">Restaurant</span>
          </div>

          {/* Navegación */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => clsx(
                  'sidebar-link',
                  isActive && 'active'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Usuario */}
          <div className="px-4 py-4 border-t border-primary-800">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-full bg-primary-700 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user?.nombre?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.nombre}</p>
                <p className="text-xs text-primary-300 capitalize">{user?.rol}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Botón menú móvil */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Título de página (móvil) */}
            <div className="lg:hidden">
              <span className="font-display font-semibold text-primary-800">Restaurant</span>
            </div>

            {/* Acciones del header */}
            <div className="flex items-center gap-3">
              {/* Estado de conexión */}
              <div className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                isConnected 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              )}>
                {isConnected ? (
                  <>
                    <Wifi className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Conectado</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Desconectado</span>
                  </>
                )}
              </div>

              {/* Estado de notificaciones para meseros/cocina */}
              <NotificationStatus />

              {/* Menú de usuario */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-700">
                      {user?.nombre?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
                </button>

                {userMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="font-medium text-gray-900">{user?.nombre}</p>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar sesión
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Contenido de página */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Banner para pedir permisos de notificación */}
      <NotificationPermission />
    </div>
  )
}
