'use client'

import { memo, useCallback, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { loginAction } from './actions'

function SubmitButton({ pinLength }: { pinLength: number }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pinLength < 4 || pending}
      className="w-full h-14 bg-brand-600 hover:bg-brand-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-lg font-semibold rounded-2xl shadow-md shadow-brand-600/30 disabled:shadow-none"
    >
      {pending ? 'Giriş yapılıyor...' : 'Giriş Yap'}
    </button>
  )
}

const NumpadKey = memo(function NumpadKey({
  digit,
  onTap,
}: {
  digit: string
  onTap: (d: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onTap(digit)}
      className="h-16 text-2xl font-semibold text-zinc-800 bg-zinc-50 active:bg-zinc-200 rounded-2xl border border-zinc-200"
    >
      {digit}
    </button>
  )
})

export default function LoginForm() {
  const [state, action] = useFormState(loginAction, undefined)
  const [pin, setPin] = useState('')

  const addDigit = useCallback((d: string) => {
    setPin((prev) => (prev.length >= 8 ? prev : prev + d))
  }, [])
  const backspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1))
  }, [])
  const clear = useCallback(() => {
    setPin('')
  }, [])

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="pin" value={pin} />

      {/* PIN dots */}
      <div className="flex justify-center gap-3 h-6 items-center">
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <div
            key={i}
            className={
              i < pin.length
                ? 'w-3.5 h-3.5 bg-brand-600 rounded-full'
                : 'w-3 h-3 rounded-full border-2 border-zinc-300'
            }
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
          <NumpadKey key={d} digit={d} onTap={addDigit} />
        ))}
        <button
          type="button"
          onClick={clear}
          className="h-16 text-sm font-semibold text-zinc-500 active:bg-zinc-100 rounded-2xl"
        >
          Sil
        </button>
        <NumpadKey digit="0" onTap={addDigit} />
        <button
          type="button"
          onClick={backspace}
          aria-label="Geri sil"
          className="h-16 text-xl font-semibold text-zinc-500 active:bg-zinc-100 rounded-2xl"
        >
          ⌫
        </button>
      </div>

      <SubmitButton pinLength={pin.length} />
    </form>
  )
}
