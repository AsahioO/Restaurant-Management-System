import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { authAPI } from '../services/api'
import {
  User,
  Mail,
  Phone,
  Lock,
  Save,
  Settings as SettingsIcon,
  Bell,
  Globe,
  Palette,
  Loader2,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Seguridad', icon: Lock },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'preferences', label: 'Preferencias', icon: Palette },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500">Administra tu cuenta y preferencias</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="card p-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && <ProfileSettings user={user} refreshUser={refreshUser} />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'preferences' && <PreferenceSettings />}
        </div>
      </div>
    </div>
  )
}

function ProfileSettings({ user, refreshUser }) {
  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    email: user?.email || '',
    telefono: user?.telefono || '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await authAPI.updateProfile(formData)
      toast.success('Perfil actualizado')
      refreshUser?.()
    } catch (error) {
      const message = error.response?.data?.message || 'Error al actualizar perfil'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold text-gray-900">Información personal</h2>
        <p className="text-sm text-gray-500 mt-1">
          Actualiza tu información de perfil
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card-body space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">
            {user?.nombre?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{user?.nombre}</h3>
            <p className="text-sm text-gray-500 capitalize">{user?.rol}</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="label">Nombre completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="label">Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="label">Teléfono</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="input pl-10"
                placeholder="Opcional"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  )
}

function SecuritySettings() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setIsSubmitting(true)

    try {
      await authAPI.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      })
      toast.success('Contraseña actualizada')
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error) {
      const message = error.response?.data?.message || 'Error al cambiar contraseña'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold text-gray-900">Cambiar contraseña</h2>
        <p className="text-sm text-gray-500 mt-1">
          Asegúrate de usar una contraseña segura
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card-body space-y-4">
        <div>
          <label className="label">Contraseña actual</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              className="input pl-10"
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Nueva contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              className="input pl-10"
              minLength={6}
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Confirmar contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="input pl-10"
              minLength={6}
              required
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Lock className="w-5 h-5 mr-2" />
            )}
            Cambiar contraseña
          </button>
        </div>
      </form>
    </div>
  )
}

function NotificationSettings() {
  const [settings, setSettings] = useState({
    orderNew: true,
    orderStatus: true,
    inventoryAlerts: true,
    lowStock: true,
    soundEnabled: true,
  })

  const handleChange = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
    toast.success('Configuración actualizada')
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold text-gray-900">Notificaciones</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configura qué notificaciones deseas recibir
        </p>
      </div>

      <div className="card-body space-y-4">
        {[
          { key: 'orderNew', label: 'Nuevas órdenes', description: 'Recibe notificación cuando llegue una nueva orden' },
          { key: 'orderStatus', label: 'Cambios de estado', description: 'Notificaciones cuando una orden cambie de estado' },
          { key: 'inventoryAlerts', label: 'Alertas de inventario', description: 'Alertas cuando el inventario esté bajo' },
          { key: 'lowStock', label: 'Stock agotado', description: 'Aviso cuando un ingrediente se agote' },
          { key: 'soundEnabled', label: 'Sonido de notificaciones', description: 'Reproducir sonido al recibir notificaciones' },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <div>
              <h4 className="font-medium text-gray-900">{item.label}</h4>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
            <button
              onClick={() => handleChange(item.key)}
              className={clsx(
                'w-12 h-7 rounded-full relative transition-colors',
                settings[item.key] ? 'bg-primary-600' : 'bg-gray-200'
              )}
            >
              <span className={clsx(
                'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                settings[item.key] ? 'right-1' : 'left-1'
              )} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function PreferenceSettings() {
  const [language, setLanguage] = useState('es-MX')
  const [theme, setTheme] = useState('light')
  const [tableLayout, setTableLayout] = useState('grid')

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold text-gray-900">Preferencias</h2>
        <p className="text-sm text-gray-500 mt-1">
          Personaliza tu experiencia
        </p>
      </div>

      <div className="card-body space-y-6">
        {/* Idioma */}
        <div>
          <label className="label flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Idioma
          </label>
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value)
              toast.success('Idioma actualizado')
            }}
            className="input"
          >
            <option value="es-MX">Español (México)</option>
            <option value="es-ES">Español (España)</option>
            <option value="en-US">English (US)</option>
          </select>
        </div>

        {/* Tema */}
        <div>
          <label className="label flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Tema
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' },
              { value: 'system', label: 'Sistema' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value)
                  toast.success('Tema actualizado')
                }}
                className={clsx(
                  'p-3 rounded-lg border-2 transition-colors',
                  theme === option.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Layout */}
        <div>
          <label className="label flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            Vista de tablas
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'grid', label: 'Cuadrícula' },
              { value: 'list', label: 'Lista' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => {
                  setTableLayout(option.value)
                  toast.success('Vista actualizada')
                }}
                className={clsx(
                  'p-3 rounded-lg border-2 transition-colors',
                  tableLayout === option.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
