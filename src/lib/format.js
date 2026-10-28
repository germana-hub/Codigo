const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const money = (v) => brl.format(Number.isFinite(+v) ? +v : 0)
export const pct = (v, digits = 1) => `${(Number.isFinite(v) ? v : 0).toFixed(digits).replace('.', ',')}%`
export const toNumber = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`)

const pad = (n) => String(n).padStart(2, '0')

export const monthKey = (y, m) => `${y}-${pad(m)}`
export const parseMonth = (key) => {
  const [y, m] = key.split('-').map(Number)
  return { y, m }
}
export const addMonths = (key, n) => {
  const { y, m } = parseMonth(key)
  const idx = y * 12 + (m - 1) + n
  return monthKey(Math.floor(idx / 12), (idx % 12) + 1)
}
export const monthDiff = (from, to) => {
  const a = parseMonth(from)
  const b = parseMonth(to)
  return (b.y - a.y) * 12 + (b.m - a.m)
}
export const daysInMonth = (key) => {
  const { y, m } = parseMonth(key)
  return new Date(y, m, 0).getDate()
}
export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const currentMonth = () => todayISO().slice(0, 7)
export const parseISO = (iso) => {
  const [y, m, d] = (iso || todayISO()).split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const toISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
export const dayOf = (iso) => Number((iso || '').slice(8, 10)) || 1
export const monthOf = (iso) => (iso || '').slice(0, 7)
export const isoInMonth = (key, day) => `${key}-${pad(Math.min(day, daysInMonth(key)))}`

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
export const monthLabel = (key) => {
  const { y, m } = parseMonth(key)
  return `${MONTHS[m - 1]} ${y}`
}
export const shortDate = (iso) => {
  if (!iso) return '—'
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export const startOfWeek = (iso) => {
  const d = parseISO(iso)
  const diff = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diff)
  return toISO(d)
}
export const addDays = (iso, n) => {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}
