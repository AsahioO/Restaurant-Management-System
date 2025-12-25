import clsx from 'clsx'

const VARIANTS = {
  default: 'bg-gray-100 text-gray-800',
  primary: 'bg-primary-100 text-primary-800',
  accent: 'bg-accent-100 text-accent-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
}

const SIZES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
  dot,
  icon: Icon,
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      {dot && (
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full mr-1.5',
            variant === 'success' && 'bg-green-500',
            variant === 'warning' && 'bg-yellow-500',
            variant === 'danger' && 'bg-red-500',
            variant === 'info' && 'bg-blue-500',
            variant === 'primary' && 'bg-primary-500',
            variant === 'accent' && 'bg-accent-500',
            variant === 'default' && 'bg-gray-500'
          )}
        />
      )}
      {Icon && <Icon className="w-3 h-3 mr-1" />}
      {children}
    </span>
  )
}
