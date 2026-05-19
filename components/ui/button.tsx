'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white shadow-sm shadow-brand-600/20',
  secondary:
    'bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-900 border border-zinc-300 shadow-sm',
  ghost: 'bg-transparent hover:bg-zinc-100 active:bg-zinc-200 text-zinc-700',
  danger: 'bg-white hover:bg-red-50 active:bg-red-100 text-red-600 border border-red-200',
  subtle: 'bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-800',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-11 px-4 text-sm rounded-xl gap-2',
  lg: 'h-13 px-6 text-base rounded-xl gap-2',
}

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = 'secondary', size = 'md', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        'select-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})
