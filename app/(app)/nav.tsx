'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

type Item = { href: string; label: string }

export function NavLinks({ items }: { items: Item[] }) {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1">
      {items.map((item) => {
        const active =
          pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition',
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
