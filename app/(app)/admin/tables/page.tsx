import { listTables } from '@/lib/db/queries'
import { createTable, deleteTable, updateTable } from '../actions'

export const dynamic = 'force-dynamic'

export default async function TablesAdminPage() {
  const tables = await listTables()
  return (
    <div>
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Masa Düzeni</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {tables.length} masa · Salon yerleşimine göre sırala
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <section className="bg-white rounded-2xl border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
            Yeni masa ekle
          </h2>
          <form action={createTable} className="flex flex-col sm:flex-row gap-2">
            <input
              name="name"
              placeholder="Örn. Masa 9, Teras 1, Bar 1"
              required
              className="flex-1 h-11 px-3.5 rounded-xl bg-white border border-zinc-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <input
              name="sort_order"
              type="number"
              placeholder="Sıra"
              defaultValue={0}
              className="sm:w-24 h-11 px-3 rounded-xl bg-white border border-zinc-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button className="h-11 px-5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold shadow-sm shadow-brand-600/20">
              + Ekle
            </button>
          </form>
        </section>

        <section className="bg-white rounded-2xl border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
            Mevcut masalar
          </h2>
          {tables.length === 0 ? (
            <div className="text-center py-10 text-zinc-400">Henüz masa eklenmemiş</div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {tables.map((t) => (
                <li key={t.id} className="py-3 flex items-center gap-2">
                  <form action={updateTable} className="flex-1 flex items-center gap-2">
                    <input type="hidden" name="id" value={t.id} />
                    <input
                      name="name"
                      defaultValue={t.name}
                      className="flex-1 h-10 px-3 rounded-lg bg-white border border-zinc-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                    <input
                      name="sort_order"
                      type="number"
                      defaultValue={t.sort_order}
                      className="w-20 h-10 px-3 rounded-lg bg-white border border-zinc-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                    <button className="h-10 px-3 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-sm font-semibold">
                      Kaydet
                    </button>
                  </form>
                  <form action={deleteTable}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="h-10 px-3 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold border border-red-200">
                      Sil
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
