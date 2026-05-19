export default function Loading() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="h-8 w-40 bg-zinc-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-32 bg-zinc-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
