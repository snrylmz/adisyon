'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export function Modal({ open, onClose, title, description, children, size = 'md' }: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm modal-backdrop"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn('relative w-full bg-white rounded-2xl shadow-2xl modal-panel', sizes[size])}
      >
        {(title || description) && (
          <div className="px-6 pt-6 pb-2">
            {title && <h2 className="text-xl font-bold text-zinc-900 tracking-tight">{title}</h2>}
            {description && <p className="text-sm text-zinc-500 mt-1">{description}</p>}
          </div>
        )}
        <div className="px-6 pb-6 pt-4">{children}</div>
        <button
          onClick={onClose}
          aria-label="Kapat"
          className="absolute top-4 right-4 w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center text-lg"
        >
          ×
        </button>
      </div>
    </div>
  )
}
