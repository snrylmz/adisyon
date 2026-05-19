'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { loginAction } from './actions'
import { cn } from '@/lib/utils'

function SubmitButton({ pinLength }: { pinLength: number }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pinLength < 4 || pending}
      className="w-full h-14 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-lg font-semibold rounded-2xl transition-all shadow-md shadow-brand-600/30 disabled:shadow-none"
    >
      {pending ? 'Giriş yapılıyor...' : 'Giriş Yap'}
    </button>
  )
}

export default function LoginForm() {
  const [state, action] = useFormState(loginAction, undefined)
  const [pin, setPin] = useState('')

  function addDigit(d: string) {
    if (pin.length >= 8) return
    setPin(pin + d)
  }
  function backspace() {
    setPin(pin.slice(0, -1))
  }
  function clear() {
    setPin('')
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="pin" value={pin} />

      {/* PIN dots */}
      <div className="flex justify-center gap-3 h-6 items-center">
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'rounded-full transition-all duration-150',
              i < pin.length
                ? 'w-3.5 h-3.5 bg-brand-600 scale-100'
                : 'w-3 h-3 bg-transparent border-2 border-zinc-300',
            )}
          />
        ))}
      </div>

      {state?.error && (
        <div className="text-center text-sm text-red-700 bg-red-50 border border-red-200 py-2.5 rounded-xl font-medium">
          {state.error}
        </div>
      )}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            type="button"
            key={d}
            onClick={() => addDigit(d)}
            className="h-16 text-2xl font-semibold text-zinc-800 bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 active:scale-95 rounded-2xl transition-all border border-zinc-200"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={clear}
          className="h-16 text-sm font-semibold text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 active:scale-95 rounded-2xl transition-all"
        >
          Sil
        </button>
        <button
          type="button"
          onClick={() => addDigit('0')}
          className="h-16 text-2xl font-semibold text-zinc-800 bg-zinc-50 hover:bg-zinc-100 active:bg-zinc-200 active:scale-95 rounded-2xl transition-all border border-zinc-200"
        >
          0
        </button>
        <button
          type="button"
          onClick={backspace}
          aria-label="Geri sil"
          className="h-16 text-xl font-semibold text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 active:scale-95 rounded-2xl transition-all"
        >
          ⌫
        </button>
      </div>

      <SubmitButton pinLength={pin.length} />
    </form>
  )
}
