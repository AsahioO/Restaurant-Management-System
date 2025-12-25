import { X } from 'lucide-react'
import clsx from 'clsx'
import { useEffect } from 'react'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-full mx-4',
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  closeOnOverlay = true,
  showCloseButton = true,
}) {
  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 animate-fade-in"
        onClick={closeOnOverlay ? onClose : undefined}
      />

      {/* Modal */}
      <div
        className={clsx(
          'relative bg-white rounded-xl shadow-xl w-full animate-slide-up',
          SIZES[size]
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
            <div>
              {title && (
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-gray-500 mt-1">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors -mr-2"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title={title}>
      {message && <p className="text-gray-600 mb-6">{message}</p>}
      
      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="btn-secondary flex-1"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={clsx(
            'flex-1',
            variant === 'danger' ? 'btn-danger' : 'btn-primary'
          )}
        >
          {isLoading ? (
            <span className="spinner w-5 h-5 border-2 border-white"></span>
          ) : (
            confirmText
          )}
        </button>
      </div>
    </Modal>
  )
}
