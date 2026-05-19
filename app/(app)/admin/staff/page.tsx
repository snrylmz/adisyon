import { listProfiles } from '@/lib/db/queries'
import { createStaff, deleteStaff, updateStaff } from '../actions'

export const dynamic = 'force-dynamic'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Yönetici',
  waiter: 'Garson',
  cashier: 'Kasa',
}
const ROLE_TONE: Record<string, string> = {
  admin: 'bg-violet-100 text-violet-800',
  waiter: 'bg-sky-100 text-sky-800',
  cashier: 'bg-amber-100 text-amber-800',
}

export default async function StaffAdminPage() {
  const profiles = await listProfiles()
  const active = profiles.filter((p) => p.active).length

  return (
    <div>
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Personel</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {active} aktif · {profiles.length} toplam
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <section className="bg-white rounded-2xl border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
            Yeni personel ekle
          </h2>
          <form action={createStaff} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input
              name="name"
              placeholder="Ad Soyad"
              required
              className="sm:col-span-5 h-11 px-3.5 rounded-xl bg-white border border-zinc-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <input
              name="pin"
              placeholder="PIN (4-8 hane)"
              required
              pattern="\d{4,8}"
              inputMode="numeric"
              className="sm:col-span-3 h-11 px-3.5 rounded-xl bg-white border border-zinc-300 font-mono tracking-widest focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <select
              name="role"
              defaultValue="waiter"
              className="sm:col-span-2 h-11 px-3 rounded-xl bg-white border border-zinc-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="waiter">Garson</option>
              <option value="cashier">Kasa</option>
              <option value="admin">Yönetici</option>
            </select>
            <button className="sm:col-span-2 h-11 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold shadow-sm shadow-brand-600/20">
              + Ekle
            </button>
          </form>
        </section>

        <section className="bg-white rounded-2xl border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
            Mevcut personel
          </h2>
          <ul className="divide-y divide-zinc-100">
            {profiles.map((p) => (
              <li key={p.id} className="py-3">
                <form
                  action={updateStaff}
                  className={`grid grid-cols-1 sm:grid-cols-12 gap-2 items-center ${
                    !p.active ? 'opacity-50' : ''
                  }`}
                >
                  <input type="hidden" name="id" value={p.id} />
                  <div className="sm:col-span-4 flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ROLE_TONE[p.role] ?? ''
                      }`}
                    >
                      {ROLE_LABEL[p.role] ?? p.role}
                    </span>
                    <input
                      name="name"
                      defaultValue={p.name}
                      className="flex-1 h-10 px-3 rounded-lg bg-white border border-zinc-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                  <input
                    name="pin"
                    defaultValue={p.pin}
                    pattern="\d{4,8}"
                    inputMode="numeric"
                    className="sm:col-span-2 h-10 px-3 rounded-lg bg-white border border-zinc-300 font-mono tracking-widest focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <select
                    name="role"
                    defaultValue={p.role}
                    className="sm:col-span-2 h-10 px-2 rounded-lg bg-white border border-zinc-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="waiter">Garson</option>
                    <option value="cashier">Kasa</option>
                    <option value="admin">Yönetici</option>
                  </select>
                  <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={p.active}
                      className="w-4 h-4 accent-brand-600"
                    />
                    Aktif
                  </label>
                  <div className="sm:col-span-2 flex gap-1">
                    <button className="flex-1 h-10 px-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-sm font-semibold">
                      Kaydet
                    </button>
                  </div>
                </form>
                {p.active && (
                  <form action={deleteStaff} className="mt-1.5 ml-1">
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-xs text-red-600 hover:underline">
                      Pasifleştir
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
