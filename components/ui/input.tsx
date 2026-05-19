'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, hint, id, ...rest },
  ref,
) {
  const inputId = id || rest.name
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        className={cn(
          'w-full h-11 px-3.5 rounded-xl bg-white border border-zinc-300',
          'text-zinc-900 placeholder:text-zinc-400',
          'focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
          'transition',
          className,
        )}
        {...rest}
      />
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  )
})

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, id, children, ...rest },
  ref,
) {
  const selectId = id || rest.name
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {label}
        </label>
      )}
      <select
        id={selectId}
        ref={ref}
        className={cn(
          'w-full h-11 px-3 rounded-xl bg-white border border-zinc-300',
          'text-zinc-900',
          'focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
          'transition',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    </div>
  )
})
