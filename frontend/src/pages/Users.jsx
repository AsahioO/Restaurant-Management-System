import { useState, useEffect } from 'react'
import { usersAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  Users as UsersIcon,
  Shield,
  User,
  Key,
  X,
  Loader2,
  Mail,
  Phone,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function Users() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [editingUser, setEditingUser] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [resetPasswordUser, setResetPasswordUser] = useState(null)

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll()
      setUsers(response.data.data.users || [])
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      toast.error('Error al cargar usuarios')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreate = async (data) => {
    try {
      await usersAPI.create(data)
      toast.success('Usuario creado exitosamente')
      setIsCreating(false)
      fetchUsers()
    } catch (error) {
      const message = error.response?.data?.message || 'Error al crear usuario'
      toast.error(message)
      throw error
    }
  }

  const handleUpdate = async (id, data) => {
    try {
      await usersAPI.update(id, data)
      toast.success('Usuario actualizado')
      setEditingUser(null)
      fetchUsers()
    } catch (error) {
      const message = error.response?.data?.message || 'Error al actualizar usuario'
      toast.error(message)
      throw error
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return

    try {
      await usersAPI.delete(id)
      toast.success('Usuario eliminado')
      fetchUsers()
    } catch (error) {
      const message = error.response?.data?.message || 'Error al eliminar usuario'
      toast.error(message)
    }
  }

  const handleResetPassword = async (id, newPassword) => {
    try {
      await usersAPI.resetPassword(id, newPassword)
      toast.success('Contraseña actualizada')
      setResetPasswordUser(null)
    } catch (error) {
      const message = error.response?.data?.message || 'Error al cambiar contraseña'
      toast.error(message)
      throw error
    }
  }

  const filteredUsers = users.filter(user =>
    user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500">{users.length} usuarios registrados</p>
        </div>

        <button onClick={() => setIsCreating(true)} className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Nuevo usuario
        </button>
      </div>

      {/* Búsqueda */}
      <div className="card">
        <div className="card-body">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Grid de usuarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map(user => (
          <div key={user.id} className="card">
            <div className="card-body">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className={clsx(
                  'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold',
                  user.rol === 'gerente' ? 'bg-primary-600' : 'bg-accent-600'
                )}>
                  {user.nombre.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{user.nombre}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  {user.telefono && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{user.telefono}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rol y estado */}
              <div className="flex items-center gap-2 mt-4">
                <span className={clsx(
                  'badge',
                  user.rol === 'gerente' 
                    ? 'bg-primary-100 text-primary-800' 
                    : 'bg-accent-100 text-accent-800'
                )}>
                  {user.rol === 'gerente' ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                  {user.rol === 'gerente' ? 'Gerente' : 'Empleado'}
                </span>
                <span className={clsx(
                  'badge',
                  user.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                )}>
                  {user.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {/* Acciones */}
              {user.id !== currentUser?.id && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setEditingUser(user)}
                    className="btn-ghost btn-sm flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </button>
                  <button
                    onClick={() => setResetPasswordUser(user)}
                    className="btn-ghost btn-sm flex-1"
                  >
                    <Key className="w-4 h-4 mr-1" />
                    Clave
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No hay usuarios</p>
        </div>
      )}

      {/* Modal de crear/editar */}
      {(isCreating || editingUser) && (
        <UserFormModal
          user={editingUser}
          onClose={() => {
            setIsCreating(false)
            setEditingUser(null)
          }}
          onSubmit={editingUser 
            ? (data) => handleUpdate(editingUser.id, data)
            : handleCreate
          }
        />
      )}

      {/* Modal de reset password */}
      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onSubmit={(password) => handleResetPassword(resetPasswordUser.id, password)}
        />
      )}
    </div>
  )
}

function UserFormModal({ user, onClose, onSubmit }) {
  const isEditing = !!user
  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    email: user?.email || '',
    password: '',
    rol: user?.rol || 'empleado',
    telefono: user?.telefono || '',
    activo: user?.activo ?? true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isEditing && !formData.password) {
      toast.error('La contraseña es requerida')
      return
    }

    setIsSubmitting(true)
    try {
      const data = { ...formData }
      if (isEditing && !data.password) {
        delete data.password
      }
      await onSubmit(data)
    } catch (error) {
      // Error handled in parent
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full animate-slide-up">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Nombre completo</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Correo electrónico</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              required
            />
          </div>

          {!isEditing && (
            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input"
                minLength={6}
                required
              />
            </div>
          )}

          <div>
            <label className="label">Teléfono</label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label">Rol</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'empleado', label: 'Empleado', icon: User },
                { value: 'gerente', label: 'Gerente', icon: Shield },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, rol: option.value })}
                  className={clsx(
                    'p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-colors',
                    formData.rol === option.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <option.icon className="w-5 h-5" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600"
              />
              <label htmlFor="activo" className="text-sm text-gray-600">
                Usuario activo
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isEditing ? (
                'Guardar'
              ) : (
                'Crear'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ResetPasswordModal({ user, onClose, onSubmit }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(password)
    } catch (error) {
      // Error handled in parent
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full animate-slide-up">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Cambiar contraseña</h2>
            <p className="text-sm text-gray-500">{user.nombre}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="label">Confirmar contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              minLength={6}
              required
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
                'Actualizar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
