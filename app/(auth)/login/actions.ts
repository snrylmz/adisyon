'use server'

import { redirect } from 'next/navigation'
import { findProfileByPin } from '@/lib/db/queries'
import { setSession, clearSession } from '@/lib/auth/session'

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData): Promise<{ error?: string }> {
  const pin = String(formData.get('pin') ?? '').trim()
  if (!/^\d{4,8}$/.test(pin)) {
    return { error: 'PIN 4-8 haneli rakam olmalı' }
  }
  const profile = await findProfileByPin(pin)
  if (!profile) {
    return { error: 'PIN bulunamadı' }
  }
  await setSession(profile.id)
  redirect('/tables')
}

export async function logoutAction() {
  await clearSession()
  redirect('/login')
}
