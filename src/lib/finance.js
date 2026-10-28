import {
  money, addDays, addMonths, currentMonth, dayOf, daysInMonth, isoInMonth, monthDiff, monthOf, startOfWeek, todayISO,
} from './format.js'
import { FUEL_CATEGORY, INSTALLMENT_CATEGORIES, MICRO_CATEGORY } from '../store/defaults.js'

export const sum = (arr, pick = (x) => x.amount) => arr.reduce((acc, x) => acc + (Number(pick(x)) || 0), 0)

export const quinzenaOfDay = (day) => (day >= 5 && day < 20 ? 1 : 2)
export const periodMatches = (period, q) => period === 'month' || (period === 'q1' ? q === 1 : q === 2)
export const PERIOD_LABELS = { month: 'Mês completo', q1: '1ª Quinzena (dia 5)', q2: '2ª Quinzena (dia 20)' }

export const cardById = (state, id) => state.cards.find((c) => c.id === id)
export const isCardMethod = (state, method) => state.cards.some((c) => c.id === method)
export const isCardCounted = (state, card) => card.type !== 'emergency' || !!state.settings.emergencyMode

export function statementMonth(dateISO, card) {
  let close = monthOf(dateISO)
  if (dayOf(dateISO) > card.closingDay) close = addMonths(close, 1)
  return card.dueDay > card.closingDay ? close : addMonths(close, 1)
}

export function chargeSchedule(charge, card) {
  const n = Math.max(1, Math.round(Number(charge.installments) || 1))
  const first = statementMonth(charge.date, card)
  return { first, n, per: (Number(charge.amount) || 0) / n, last: addMonths(first, n - 1) }
}

export function installmentAt(charge, card, month) {
  const s = chargeSchedule(charge, card)
  const idx = monthDiff(s.first, month)
  return idx >= 0 && idx < s.n ? { number: idx + 1, ...s } : null
}

export function cardBillItems(state, card, month) {
  const items = []
  for (const ch of state.charges) {
    if (ch.cardId !== card.id) continue
    const inst = installmentAt(ch, card, month)
    if (inst) {
      items.push({
        kind: 'charge', entry: ch, label: ch.description, category: ch.category, date: ch.date, amount: inst.per,
        installmentLabel: inst.n > 1 ? `${inst.number}/${inst.n}` : null,
      })
    }
  }
  for (const f of state.fixedExpenses) {
    if (f.active && f.paymentMethod === card.id) {
      items.push({ kind: 'fixed', entry: f, label: f.name, category: f.category, date: isoInMonth(month, f.dueDay), amount: Number(f.amount) || 0, installmentLabel: 'recorrente' })
    }
  }
  for (const m of state.microExpenses) {
    if (m.paymentMethod === card.id && statementMonth(m.date, card) === month) {
      items.push({ kind: 'micro', entry: m, label: m.description || m.tag, category: MICRO_CATEGORY, date: m.date, amount: Number(m.amount) || 0 })
    }
  }
  for (const f of state.fuelLogs) {
    if (f.paymentMethod === card.id && statementMonth(f.date, card) === month) {
      items.push({ kind: 'fuel', entry: f, label: f.note || 'Combustível consulta', category: FUEL_CATEGORY, date: f.date, amount: Number(f.amount) || 0 })
    }
  }
  return items.sort((a, b) => (a.date < b.date ? -1 : 1))
}

export function cardDebt(state, card, month, excludeId = null) {
  let debt = 0
  for (const ch of state.charges) {
    if (ch.cardId !== card.id || ch.id === excludeId) continue
    const s = chargeSchedule(ch, card)
    const idx = monthDiff(s.first, month)
    const remaining = idx < 0 ? s.n : Math.max(0, s.n - idx)
    debt += remaining * s.per
  }
  for (const list of [state.microExpenses, state.fuelLogs]) {
    for (const e of list) {
      if (e.paymentMethod === card.id && e.id !== excludeId && monthDiff(month, statementMonth(e.date, card)) >= 0) debt += Number(e.amount) || 0
    }
  }
  for (const f of state.fixedExpenses) {
    if (f.active && f.paymentMethod === card.id && f.id !== excludeId) debt += Number(f.amount) || 0
  }
  return debt
}

export function cardWeekSpend(state, card, weekStart, excludeId = null) {
  const end = addDays(weekStart, 6)
  const inWeek = (d) => d >= weekStart && d <= end
  let total = 0
  for (const ch of state.charges) if (ch.cardId === card.id && ch.id !== excludeId && inWeek(ch.date)) total += Number(ch.amount) || 0
  for (const list of [state.microExpenses, state.fuelLogs]) {
    for (const e of list) if (e.paymentMethod === card.id && e.id !== excludeId && inWeek(e.date)) total += Number(e.amount) || 0
  }
  return total
}

export function weeksOfMonth(month) {
  const first = `${month}-01`
  const last = isoInMonth(month, 31)
  const weeks = []
  for (let ws = startOfWeek(first); ws <= last; ws = addDays(ws, 7)) {
    const we = addDays(ws, 6)
    const from = ws < first ? first : ws
    const to = we > last ? last : we
    const days = dayOf(to) - dayOf(from) + 1
    weeks.push({ start: ws, end: we, from, to, days, label: `${from.slice(8)}–${to.slice(8)}` })
  }
  return weeks
}

export function referenceDate(month) {
  const t = todayISO()
  return monthOf(t) === month ? t : `${month}-01`
}

export function cardSummary(state, card, month) {
  const items = cardBillItems(state, card, month)
  const bill = sum(items)
  const debt = cardDebt(state, card, month)
  const limit = Number(card.limit) || 0
  const usagePct = limit > 0 ? (debt / limit) * 100 : 0
  const ownCharges = state.charges.filter((c) => c.cardId === card.id)
  const lastMonth = ownCharges.reduce((acc, ch) => {
    const l = chargeSchedule(ch, card).last
    return !acc || l > acc ? l : acc
  }, null)
  const ws = startOfWeek(referenceDate(month))
  const weekSpend = card.type === 'weekly' ? cardWeekSpend(state, card, ws) : 0
  const cap = Number(card.weeklyCap) || 0
  return {
    card, items, bill, debt, limit, usagePct, available: limit - debt, counted: isCardCounted(state, card),
    payoffMonths: lastMonth ? Math.max(0, monthDiff(month, lastMonth) + 1) : 0, lastMonth,
    weekStart: ws, weekSpend, weekCap: cap, weekPct: cap > 0 ? (weekSpend / cap) * 100 : 0,
  }
}

export const monthlyIncome = (state, month) =>
  sum(state.incomes.filter((i) => i.recurring || i.month === month))

export function periodDays(month, period) {
  const dim = daysInMonth(month)
  if (period === 'q1') return 15
  if (period === 'q2') return dim - 15
  return dim
}

export function computeBudget(state, month, period) {
  const incomes = state.incomes.filter((i) => (i.recurring || i.month === month) && periodMatches(period, quinzenaOfDay(i.day)))
  const fixedDirect = state.fixedExpenses.filter((f) => f.active && !isCardMethod(state, f.paymentMethod) && periodMatches(period, Number(f.quinzena) || quinzenaOfDay(f.dueDay)))
  const cardBills = state.cards
    .filter((c) => isCardCounted(state, c) && periodMatches(period, Number(c.payQuinzena) || quinzenaOfDay(c.dueDay)))
    .map((card) => ({ card, total: sum(cardBillItems(state, card, month)) }))
    .filter((b) => b.total > 0)
  const directFilter = (e) => !isCardMethod(state, e.paymentMethod) && monthOf(e.date) === month && periodMatches(period, quinzenaOfDay(dayOf(e.date)))
  const microDirect = state.microExpenses.filter(directFilter)
  const fuelDirect = state.fuelLogs.filter(directFilter)

  const income = sum(incomes)
  const fixed = sum(fixedDirect)
  const cards = sum(cardBills, (b) => b.total)
  const micro = sum(microDirect)
  const fuel = sum(fuelDirect)
  const outflow = fixed + cards + micro + fuel
  const balance = income - outflow

  const fuelPeriodActual = sum(state.fuelLogs.filter((f) => monthOf(f.date) === month && periodMatches(period, quinzenaOfDay(dayOf(f.date)))))
  const fuelProjected = fuelProjection(state, periodDays(month, period)).avg
  const cm = currentMonth()
  const diff = monthDiff(cm, month)
  const remainingFuel = diff < 0 ? 0 : Math.max(0, fuelProjected - fuelPeriodActual)
  const forecast = balance - remainingFuel

  const events = [
    ...incomes.map((i) => ({ day: i.day, label: i.name, amount: Number(i.amount) || 0 })),
    ...fixedDirect.map((f) => ({ day: f.dueDay, label: f.name, amount: -(Number(f.amount) || 0) })),
    ...cardBills.map((b) => ({ day: b.card.dueDay, label: `Fatura ${b.card.name}`, amount: -b.total })),
    ...[...microDirect, ...fuelDirect].map((e) => ({ day: dayOf(e.date), label: e.description || e.note || 'Variável', amount: -(Number(e.amount) || 0) })),
  ]
  const order = (d) => (period === 'q2' && d < 5 ? d + 31 : d)
  events.sort((a, b) => order(a.day) - order(b.day))
  const byDay = new Map()
  let running = 0
  for (const ev of events) {
    running += ev.amount
    byDay.set(ev.day, { day: ev.day, saldo: Math.round(running * 100) / 100 })
  }
  const timeline = [...byDay.values()].map((p) => ({ ...p, label: `Dia ${p.day}` }))

  return { incomes, fixedDirect, cardBills, microDirect, fuelDirect, income, fixed, cards, micro, fuel, outflow, balance, forecast, remainingFuel, timeline }
}

export function fuelProjection(state, days) {
  const s = state.settings
  const tripsPerDay = (Number(s.fuelTripsPerWeek) || 0) / 7
  const min = Number(s.fuelCostMin) || 0
  const max = Number(s.fuelCostMax) || 0
  const trips = tripsPerDay * days
  return { trips, min: trips * min, max: trips * max, avg: trips * ((min + max) / 2) }
}

export function fuelStats(state, month) {
  const logs = state.fuelLogs.filter((f) => monthOf(f.date) === month).sort((a, b) => (a.date < b.date ? 1 : -1))
  const actual = sum(logs)
  const trips = sum(logs, (l) => l.trips || 1)
  const proj = fuelProjection(state, daysInMonth(month))
  const weeks = weeksOfMonth(month).map((w) => {
    const wl = logs.filter((l) => l.date >= w.from && l.date <= w.to)
    const p = fuelProjection(state, w.days)
    return { ...w, actual: sum(wl), trips: sum(wl, (l) => l.trips || 1), projected: p.avg, min: p.min, max: p.max, plannedTrips: p.trips }
  })
  return { logs, actual, trips, projected: proj, weeks, avgPerTrip: trips ? actual / trips : 0 }
}

export function microStats(state, month) {
  const items = state.microExpenses.filter((m) => monthOf(m.date) === month).sort((a, b) => (a.date < b.date ? 1 : -1))
  const total = sum(items)
  const income = monthlyIncome(state, month)
  const pctOfIncome = income > 0 ? (total / income) * 100 : 0
  const byTag = {}
  for (const m of items) byTag[m.tag || 'Outros'] = (byTag[m.tag || 'Outros'] || 0) + (Number(m.amount) || 0)
  const t = todayISO()
  const dim = daysInMonth(month)
  const elapsed = monthOf(t) === month ? dayOf(t) : monthDiff(month, currentMonth()) > 0 ? dim : 0
  const projected = elapsed > 0 ? (total / elapsed) * dim : total
  return {
    items, total, income, pctOfIncome, count: items.length, projected, projectedPct: income > 0 ? (projected / income) * 100 : 0,
    byTag: Object.entries(byTag).map(([tag, value]) => ({ tag, value })).sort((a, b) => b.value - a.value),
    yearly: (projected || total) * 12,
  }
}

export function categorySpend(state, month) {
  const map = new Map()
  const add = (name, v) => map.set(name || 'Outros', (map.get(name || 'Outros') || 0) + v)
  for (const ch of state.charges) {
    const card = cardById(state, ch.cardId)
    if (!card) continue
    const inst = installmentAt(ch, card, month)
    if (inst) add(ch.category, inst.per)
  }
  for (const f of state.fixedExpenses) if (f.active) add(f.category, Number(f.amount) || 0)
  for (const m of state.microExpenses) if (monthOf(m.date) === month) add(MICRO_CATEGORY, Number(m.amount) || 0)
  for (const f of state.fuelLogs) if (monthOf(f.date) === month) add(FUEL_CATEGORY, Number(f.amount) || 0)
  return state.categories
    .map((c) => ({ ...c, spent: map.get(c.name) || 0 }))
    .concat([...map.entries()].filter(([n]) => !state.categories.some((c) => c.name === n)).map(([name, spent]) => ({ id: name, name, limit: 0, color: '#94a3b8', spent })))
}

export function validateEntry(state, kind, entry, editingId = null) {
  if (!(Number(entry.amount) > 0) && kind !== 'card' && kind !== 'category') return 'Informe um valor maior que zero.'
  const cardId = kind === 'charge' ? entry.cardId : entry.paymentMethod
  const card = cardById(state, cardId)
  if (!card || kind === 'income' || kind === 'card' || kind === 'category') return null

  if (card.type === 'installments') {
    if (kind !== 'charge' && kind !== 'fixed') return `"${card.name}" é exclusivo para parcelas de manutenção do carro e reforma. Compras gerais estão bloqueadas.`
    if (!INSTALLMENT_CATEGORIES.includes(entry.category)) return `"${card.name}" só aceita as categorias: ${INSTALLMENT_CATEGORIES.join(' ou ')}.`
  }
  const amount = Number(entry.amount) || 0
  if (kind !== 'fixed' && card.type === 'weekly' && Number(card.weeklyCap) > 0) {
    const ws = startOfWeek(entry.date)
    const spent = cardWeekSpend(state, card, ws, editingId)
    if (spent + amount > Number(card.weeklyCap) + 0.001) {
      return `Teto semanal de "${card.name}" excedido: já gasto ${money(spent)} de ${money(card.weeklyCap)} nesta semana (restam ${money(Math.max(0, card.weeklyCap - spent))}).`
    }
  }
  const limit = Number(card.limit) || 0
  if (limit > 0) {
    const debt = cardDebt(state, card, currentMonth(), editingId)
    if (debt + amount > limit + 0.001) return `Limite insuficiente em "${card.name}": disponível ${money(Math.max(0, limit - debt))}.`
  }
  return null
}
