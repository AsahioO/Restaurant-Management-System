import clsx from 'clsx'
import { Loader2 } from 'lucide-react'
import { forwardRef } from 'react'

const VARIANTS = {
  primary: 'bg-primary-700 text-white hover:bg-primary-800 focus:ring-primary-500',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-400',
  accent: 'bg-accent-600 text-white hover:bg-accent-700 focus:ring-accent-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-200',
  link: 'bg-transparent text-primary-700 hover:underline p-0',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  className,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Cargando...
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            <Icon className={clsx('w-4 h-4', children && 'mr-2')} />
          )}
          {children}
          {Icon && iconPosition === 'right' && (
            <Icon className={clsx('w-4 h-4', children && 'ml-2')} />
          )}
        </>
      )}
    </button>
  )
})

Button.displayName = 'Button'

export default Button
