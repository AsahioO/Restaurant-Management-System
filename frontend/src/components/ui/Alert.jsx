import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'
import clsx from 'clsx'

const VARIANTS = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-500',
    textColor: 'text-green-800',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    textColor: 'text-red-800',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-500',
    textColor: 'text-yellow-800',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    textColor: 'text-blue-800',
  },
}

export default function Alert({ 
  variant = 'info', 
  title, 
  children, 
  onClose,
  className,
}) {
  const config = VARIANTS[variant]
  const Icon = config.icon

  return (
    <div
      className={clsx(
        'rounded-lg border p-4',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <div className="flex">
        <Icon className={clsx('w-5 h-5 flex-shrink-0', config.iconColor)} />
        
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={clsx('text-sm font-medium', config.textColor)}>
              {title}
            </h3>
          )}
          {children && (
            <div className={clsx('text-sm', config.textColor, title && 'mt-1')}>
              {children}
            </div>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className={clsx(
              'ml-3 flex-shrink-0 rounded-md p-1.5 hover:bg-white/50 transition-colors',
              config.textColor
            )}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
