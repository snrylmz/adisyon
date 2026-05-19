'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="text-sm text-zinc-500 hover:text-zinc-900 underline"
    >
      Yazdır / PDF olarak kaydet
    </button>
  )
}
