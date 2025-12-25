import clsx from 'clsx'

export default function Card({ 
  children, 
  className,
  padding = true,
  hover = false,
  onClick,
}) {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden',
        hover && 'hover:shadow-md hover:border-gray-300 transition-all cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {padding ? <div className="p-6">{children}</div> : children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return (
    <div className={clsx('px-6 py-4 border-b border-gray-100', className)}>
      {children}
    </div>
  )
}

export function CardBody({ children, className }) {
  return (
    <div className={clsx('p-6', className)}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className }) {
  return (
    <div className={clsx('px-6 py-4 bg-gray-50 border-t border-gray-100', className)}>
      {children}
    </div>
  )
}
