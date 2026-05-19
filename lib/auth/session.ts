import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { getProfile } from '@/lib/db/queries'
import type { SessionUser } from '@/lib/types'

const COOKIE_NAME = 'adisyon_session'
const MAX_AGE_SEC = 60 * 60 * 24 * 30 // 30 gün

function secret(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET env değişkeni en az 16 karakter olmalı')
  }
  return s
}

function sign(value: string): string {
  const sig = crypto.createHmac('sha256', secret()).update(value).digest('base64url')
  return `${value}.${sig}`
}

function verify(signed: string): string | null {
  const idx = signed.lastIndexOf('.')
  if (idx < 0) return null
  const value = signed.slice(0, idx)
  const sig = signed.slice(idx + 1)
  const expected = crypto.createHmac('sha256', secret()).update(value).digest('base64url')
  try {
    if (sig.length !== expected.length) return null
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch {
    return null
  }
  return value
}

export async function setSession(profileId: string) {
  const c = await cookies()
  c.set(COOKIE_NAME, sign(profileId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SEC,
  })
}

export async function clearSession() {
  const c = await cookies()
  c.delete(COOKIE_NAME)
}

export async function readSessionId(): Promise<string | null> {
  const c = await cookies()
  const raw = c.get(COOKIE_NAME)?.value
  if (!raw) return null
  return verify(raw)
}

// React cache() — aynı request içinde birden fazla çağrı tek DB sorgusuyla cevaplanır
// (layout + page hep birlikte getCurrentUser çağırıyor)
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const id = await readSessionId()
  if (!id) return null
  const p = await getProfile(id)
  if (!p || !p.active) return null
  return { id: p.id, name: p.name, role: p.role }
})

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser()
  if (!u) throw new Error('UNAUTHORIZED')
  return u
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser()
  if (u.role !== 'admin') throw new Error('FORBIDDEN')
  return u
}
