import clsx from 'clsx'

const SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-4',
  xl: 'w-16 h-16 border-4',
}

const COLORS = {
  primary: 'border-primary-600',
  accent: 'border-accent-600',
  white: 'border-white',
  gray: 'border-gray-600',
}

export default function Spinner({ 
  size = 'md', 
  color = 'primary',
  className,
}) {
  return (
    <div
      className={clsx(
        'rounded-full animate-spin border-gray-200',
        SIZES[size],
        className
      )}
      style={{
        borderTopColor: color === 'white' ? 'white' : 
          color === 'primary' ? '#C2410C' :
          color === 'accent' ? '#059669' : '#4B5563'
      }}
    />
  )
}

export function LoadingScreen({ message = 'Cargando...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}

export function LoadingOverlay({ message }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        {message && <p className="text-gray-600">{message}</p>}
      </div>
    </div>
  )
}
