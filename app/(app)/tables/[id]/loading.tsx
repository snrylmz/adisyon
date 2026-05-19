export default function Loading() {
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
      <aside className="lg:w-[440px] bg-white border-r border-zinc-200 p-5 space-y-4">
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-zinc-100 rounded-xl animate-pulse" />
          <div className="h-10 w-32 bg-zinc-100 rounded-xl animate-pulse ml-auto" />
        </div>
        <div className="h-10 w-40 bg-zinc-200 rounded-lg animate-pulse" />
        <div className="space-y-2 pt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-zinc-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </aside>
      <section className="flex-1 bg-zinc-50 p-4">
        <div className="h-11 bg-white rounded-xl animate-pulse mb-3" />
        <div className="flex gap-2 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 w-24 bg-zinc-100 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      </section>
    </div>
  )
}
