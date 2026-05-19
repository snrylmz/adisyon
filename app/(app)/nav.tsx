'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type Item = { href: string; label: string }

export function NavLinks({ items }: { items: Item[] }) {
  const pathname = usePathname()
  return (
    <nav className="flex gap-0.5">
      {items.map((item) => {
        const active =
          pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition',
              active
                ? 'text-brand-700 bg-brand-50'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function AdminMenu({ items }: { items: Item[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const hasActive = items.some((i) => pathname.startsWith(i.href))

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    if (open) {
      document.addEventListener('click', onClickOutside)
      return () => document.removeEventListener('click', onClickOutside)
    }
  }, [open])

  // Sayfa değiştiğinde menüyü kapat
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1 transition',
          hasActive
            ? 'text-brand-700 bg-brand-50'
            : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100',
        )}
      >
        Yönetim
        <span className={cn('text-xs transition-transform', open && 'rotate-180')}>▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-48 bg-white rounded-xl border border-zinc-200 shadow-lg py-1 z-30">
          {items.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block px-4 py-2 text-sm font-medium transition',
                  active
                    ? 'text-brand-700 bg-brand-50'
                    : 'text-zinc-700 hover:bg-zinc-100',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
