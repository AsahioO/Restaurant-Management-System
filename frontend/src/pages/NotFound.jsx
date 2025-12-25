import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center animate-fade-in">
        {/* 404 Icon */}
        <div className="mb-8">
          <span className="text-9xl font-bold text-primary-200">404</span>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Página no encontrada
        </h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" className="btn-primary">
            <Home className="w-5 h-5 mr-2" />
            Ir al inicio
          </Link>
          <button 
            onClick={() => window.history.back()}
            className="btn-secondary"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver atrás
          </button>
        </div>
      </div>
    </div>
  )
}
