import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

// Layouts
import MainLayout from './components/layouts/MainLayout'
import AuthLayout from './components/layouts/AuthLayout'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Menu from './pages/Menu'
import Orders from './pages/Orders'
import NewOrder from './pages/NewOrder'
import Kitchen from './pages/Kitchen'
import Inventory from './pages/Inventory'
import Users from './pages/Users'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

// Componente para rutas protegidas
function ProtectedRoute({ children, allowedRoles }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-10 h-10 border-4 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner w-12 h-12 border-4 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={
          user ? <Navigate to="/" replace /> : <Login />
        } />
      </Route>

      {/* Rutas protegidas */}
      <Route element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        {/* Dashboard - solo gerentes */}
        <Route path="/" element={
          user?.rol === 'gerente' 
            ? <Dashboard /> 
            : user?.rol === 'cocina'
            ? <Navigate to="/kitchen" replace />
            : <Navigate to="/orders/new" replace />
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['gerente']}>
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* Cocina - solo rol cocina */}
        <Route path="/kitchen" element={
          <ProtectedRoute allowedRoles={['cocina', 'gerente']}>
            <Kitchen />
          </ProtectedRoute>
        } />

        {/* Menú - todos */}
        <Route path="/menu" element={<Menu />} />

        {/* Órdenes */}
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/new" element={<NewOrder />} />

        {/* Inventario - solo gerentes */}
        <Route path="/inventory" element={
          <ProtectedRoute allowedRoles={['gerente']}>
            <Inventory />
          </ProtectedRoute>
        } />

        {/* Usuarios - solo gerentes */}
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['gerente']}>
            <Users />
          </ProtectedRoute>
        } />

        {/* Configuración - solo gerentes */}
        <Route path="/settings" element={
          <ProtectedRoute allowedRoles={['gerente']}>
            <Settings />
          </ProtectedRoute>
        } />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
