import { currentMonth, toNumber, todayISO } from './format.js'
import { validateEntry } from './finance.js'

export const COLLECTION = {
  income: 'incomes', fixed: 'fixedExpenses', charge: 'charges', micro: 'microExpenses', fuel: 'fuelLogs', card: 'cards', category: 'categories',
}

export const KIND_LABELS = {
  income: 'Receita', fixed: 'Despesa fixa', charge: 'Compra no cartão', micro: 'Gasto formiguinha', fuel: 'Combustível consulta', card: 'Cartão', category: 'Categoria',
}

const clampInt = (v, min, max, fallback) => {
  const n = Math.round(toNumber(v))
  if (!Number.isFinite(n) || n === 0) return fallback
  return Math.max(min, Math.min(max, n))
}

export function normalizeEntry(kind, form) {
  const f = { ...form }
  switch (kind) {
    case 'income':
      return { ...f, name: String(f.name || '').trim(), amount: toNumber(f.amount), day: clampInt(f.day, 1, 31, 5), recurring: !!f.recurring, month: f.recurring ? null : f.month || currentMonth() }
    case 'fixed':
      return { ...f, name: String(f.name || '').trim(), amount: toNumber(f.amount), dueDay: clampInt(f.dueDay, 1, 31, 10), quinzena: Number(f.quinzena) === 2 ? 2 : 1, active: f.active !== false }
    case 'charge':
      return { ...f, description: String(f.description || '').trim(), amount: toNumber(f.amount), installments: clampInt(f.installments, 1, 72, 1), date: f.date || todayISO() }
    case 'micro':
      return { ...f, description: String(f.description || '').trim(), amount: toNumber(f.amount), date: f.date || todayISO() }
    case 'fuel':
      return { ...f, note: String(f.note || '').trim(), amount: toNumber(f.amount), trips: clampInt(f.trips, 1, 14, 1), date: f.date || todayISO() }
    case 'card':
      return {
        ...f, name: String(f.name || '').trim(), limit: toNumber(f.limit), closingDay: clampInt(f.closingDay, 1, 31, 1), dueDay: clampInt(f.dueDay, 1, 31, 10),
        weeklyCap: toNumber(f.weeklyCap), payQuinzena: Number(f.payQuinzena) === 2 ? 2 : 1,
      }
    case 'category':
      return { ...f, name: String(f.name || '').trim(), limit: toNumber(f.limit) }
    default:
      return f
  }
}

const REQUIRED = { income: ['name', 'o nome da receita'], fixed: ['name', 'o nome da despesa'], charge: ['description', 'a descrição da compra'], card: ['name', 'o nome do cartão'], category: ['name', 'o nome da categoria'] }

export function saveEntry(store, kind, form, editingId = null) {
  const { state } = store
  const item = normalizeEntry(kind, form)
  const req = REQUIRED[kind]
  if (req && !item[req[0]]) return `Informe ${req[1]}.`
  if (kind === 'charge' && !state.cards.some((c) => c.id === item.cardId)) return 'Selecione um cartão.'
  if (kind === 'category' && state.categories.some((c) => c.id !== editingId && c.name.toLowerCase() === item.name.toLowerCase())) return 'Já existe uma categoria com esse nome.'
  const err = validateEntry(state, kind, item, editingId)
  if (err) return err

  if (kind === 'category' && editingId) {
    const old = state.categories.find((c) => c.id === editingId)
    if (old && old.name !== item.name) {
      const rename = (x) => (x.category === old.name ? { ...x, category: item.name } : x)
      store.replace({
        ...state,
        categories: state.categories.map((c) => (c.id === editingId ? { ...c, ...item, id: c.id } : c)),
        charges: state.charges.map(rename),
        fixedExpenses: state.fixedExpenses.map(rename),
      })
      return null
    }
  }
  const { id: _ignored, ...data } = item
  if (editingId) store.update(COLLECTION[kind], editingId, data)
  else store.add(COLLECTION[kind], data)
  return null
}

export const entryTitle = (kind, e) => (e ? e.name || e.description || e.note || e.tag || KIND_LABELS[kind] : KIND_LABELS[kind])
