import clsx from 'clsx'
import { forwardRef } from 'react'

const Input = forwardRef(({ 
  label,
  error,
  icon: Icon,
  className,
  containerClassName,
  ...props 
}, ref) => {
  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full px-4 py-2.5 text-sm rounded-lg border transition-colors',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            Icon && 'pl-10',
            error
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
