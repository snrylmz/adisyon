// Türkiye sabit UTC+3 (2016'dan beri DST kaldırıldı). Bu sayede
// sabit offset ile güvenli tarih sınırları üretebiliyoruz.

const TR_OFFSET = '+03:00'

function todayInTR(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function addDays(yyyyMmDd: string, days: number): string {
  const d = new Date(`${yyyyMmDd}T12:00:00${TR_OFFSET}`)
  d.setDate(d.getDate() + days)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function startOfMonth(yyyyMmDd: string): string {
  const [y, m] = yyyyMmDd.split('-')
  return `${y}-${m}-01`
}

function startOfWeek(yyyyMmDd: string): string {
  // Hafta başlangıcı = Pazartesi
  const d = new Date(`${yyyyMmDd}T12:00:00${TR_OFFSET}`)
  const dow = (d.getUTCDay() + 6) % 7 // 0=Pzt
  return addDays(yyyyMmDd, -dow)
}

export type RangeKey = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

export type DateRange = {
  key: RangeKey
  fromISO: string
  toISO: string
  fromYmd: string
  toYmd: string
  label: string
}

function makeRange(fromYmd: string, toYmd: string, key: RangeKey, label: string): DateRange {
  return {
    key,
    fromYmd,
    toYmd,
    fromISO: `${fromYmd}T00:00:00${TR_OFFSET}`,
    toISO: `${toYmd}T23:59:59.999${TR_OFFSET}`,
    label,
  }
}

export function resolveRange(input?: { range?: string; from?: string; to?: string }): DateRange {
  const today = todayInTR()
  const range = input?.range as RangeKey | undefined

  if (range === 'yesterday') {
    const y = addDays(today, -1)
    return makeRange(y, y, 'yesterday', 'Dün')
  }
  if (range === 'week') {
    return makeRange(startOfWeek(today), today, 'week', 'Bu hafta')
  }
  if (range === 'month') {
    return makeRange(startOfMonth(today), today, 'month', 'Bu ay')
  }
  if (range === 'custom' && input?.from && input?.to) {
    return makeRange(input.from, input.to, 'custom', `${input.from} – ${input.to}`)
  }
  return makeRange(today, today, 'today', 'Bugün')
}

export function formatDateTimeTR(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatDateTR(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function hourInTR(iso: string): number {
  const s = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    hour12: false,
  }).format(new Date(iso))
  return Number(s.replace(':', '').slice(0, 2))
}
