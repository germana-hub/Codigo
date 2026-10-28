import { addMonths, currentMonth, isoInMonth, todayISO, uid } from '../lib/format.js'

export const STORAGE_KEY = 'financas-quinzenais:v1'
export const SCHEMA_VERSION = 1

export const CARD_TYPES = {
  main: { label: 'Principal', description: 'Despesas do dia a dia, assinaturas e contas de consumo.' },
  installments: { label: 'Manutenção & Reforma', description: 'Somente parcelas fixas de reparos do carro e reforma da casa. Novas compras gerais bloqueadas.' },
  weekly: { label: 'Semanal', description: 'Gastos variáveis da semana com teto rígido.' },
  emergency: { label: 'Emergência', description: 'Reserva estratégica. Fora do orçamento, exceto com o modo emergência ativo.' },
}

export const INSTALLMENT_CATEGORIES = ['Manutenção Carro', 'Reforma Casa']
export const FUEL_CATEGORY = 'Combustível Médico'
export const MICRO_CATEGORY = 'Gastos Formiguinha'

export const PAYMENT_METHODS = [
  { id: 'pix', label: 'Pix' },
  { id: 'debito', label: 'Débito' },
  { id: 'dinheiro', label: 'Dinheiro' },
  { id: 'boleto', label: 'Boleto / Conta' },
]

export const MICRO_TAGS = ['Lanche', 'Café', 'Doce', 'Delivery', 'Impulso', 'Bebida', 'Outros']

const PALETTE = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b', '#84cc16', '#6366f1', '#06b6d4']

const cat = (name, limit, i) => ({ id: uid(), name, limit, color: PALETTE[i % PALETTE.length] })

export const defaultCategories = () =>
  [
    ['Mercado/Alimentação', 1800],
    ['Moradia', 0],
    ['Contas de Consumo', 700],
    ['Assinaturas', 150],
    ['Transporte', 400],
    ['Saúde', 600],
    [FUEL_CATEGORY, 450],
    [MICRO_CATEGORY, 400],
    ['Manutenção Carro', 0],
    ['Reforma Casa', 0],
    ['Lazer', 300],
    ['Outros', 0],
  ].map(([n, l], i) => cat(n, l, i))

export const defaultSettings = () => ({
  emergencyMode: false,
  microAlertPct: 3,
  microDangerPct: 5,
  fuelTripsPerWeek: 2,
  fuelCostMin: 30,
  fuelCostMax: 50,
  cardWarnPct: 60,
  cardDangerPct: 80,
  categoryWarnPct: 80,
})

export const defaultIncomes = () => [
  { id: uid(), name: '1º Pagamento (Quinzena 1)', amount: 6500, day: 5, recurring: true, month: null },
  { id: uid(), name: '2º Pagamento (Quinzena 2)', amount: 5829, day: 20, recurring: true, month: null },
  { id: uid(), name: 'Bônus de Produção', amount: 450, day: 26, recurring: true, month: null },
]

export const defaultCards = () => [
  { id: 'card-main', name: 'Cartão Principal', type: 'main', limit: 6000, closingDay: 28, dueDay: 7, weeklyCap: 0, payQuinzena: 1, color: '#4f46e5' },
  { id: 'card-reno', name: 'Carro & Reforma', type: 'installments', limit: 8000, closingDay: 10, dueDay: 20, weeklyCap: 0, payQuinzena: 2, color: '#0f766e' },
  { id: 'card-week1', name: 'Semanal 1', type: 'weekly', limit: 1500, closingDay: 3, dueDay: 12, weeklyCap: 250, payQuinzena: 1, color: '#d97706' },
  { id: 'card-week2', name: 'Semanal 2', type: 'weekly', limit: 1500, closingDay: 18, dueDay: 25, weeklyCap: 250, payQuinzena: 2, color: '#db2777' },
  { id: 'card-emerg', name: 'Emergência', type: 'emergency', limit: 5000, closingDay: 15, dueDay: 22, weeklyCap: 0, payQuinzena: 2, color: '#dc2626' },
]

export const blankState = () => ({
  version: SCHEMA_VERSION,
  settings: defaultSettings(),
  categories: defaultCategories(),
  microTags: [...MICRO_TAGS],
  incomes: defaultIncomes(),
  cards: defaultCards(),
  fixedExpenses: [],
  charges: [],
  microExpenses: [],
  fuelLogs: [],
})

export const demoState = () => {
  const s = blankState()
  const m = currentMonth()
  const today = todayISO()
  const day = Number(today.slice(8, 10))
  const past = (d) => isoInMonth(m, Math.min(d, day))

  s.fixedExpenses = [
    { id: uid(), name: 'Aluguel / Financiamento', amount: 2200, category: 'Moradia', dueDay: 10, quinzena: 1, paymentMethod: 'boleto', active: true },
    { id: uid(), name: 'Energia', amount: 280, category: 'Contas de Consumo', dueDay: 12, quinzena: 1, paymentMethod: 'card-main', active: true },
    { id: uid(), name: 'Água', amount: 110, category: 'Contas de Consumo', dueDay: 15, quinzena: 1, paymentMethod: 'card-main', active: true },
    { id: uid(), name: 'Internet + Celular', amount: 189.9, category: 'Contas de Consumo', dueDay: 22, quinzena: 2, paymentMethod: 'card-main', active: true },
    { id: uid(), name: 'Streaming', amount: 55.9, category: 'Assinaturas', dueDay: 8, quinzena: 1, paymentMethod: 'card-main', active: true },
    { id: uid(), name: 'Plano de Saúde', amount: 480, category: 'Saúde', dueDay: 25, quinzena: 2, paymentMethod: 'boleto', active: true },
  ]

  s.charges = [
    { id: uid(), cardId: 'card-reno', description: 'Reparo suspensão + freios', category: 'Manutenção Carro', amount: 3600, installments: 10, date: isoInMonth(addMonths(m, -2), 4) },
    { id: uid(), cardId: 'card-reno', description: 'Reforma banheiro (material)', category: 'Reforma Casa', amount: 4800, installments: 12, date: isoInMonth(addMonths(m, -1), 6) },
    { id: uid(), cardId: 'card-main', description: 'Mercado do mês', category: 'Mercado/Alimentação', amount: 980, installments: 1, date: past(6) },
    { id: uid(), cardId: 'card-main', description: 'Farmácia', category: 'Saúde', amount: 142.5, installments: 1, date: past(9) },
    { id: uid(), cardId: 'card-week1', description: 'Feira / hortifruti', category: 'Mercado/Alimentação', amount: 135, installments: 1, date: past(day) },
    { id: uid(), cardId: 'card-week2', description: 'Padaria + açougue', category: 'Mercado/Alimentação', amount: 160, installments: 1, date: past(day) },
  ]

  s.microExpenses = [
    { id: uid(), date: past(2), description: 'Café na padaria', tag: 'Café', amount: 8.5, paymentMethod: 'pix' },
    { id: uid(), date: past(4), description: 'Salgado + refri', tag: 'Lanche', amount: 14, paymentMethod: 'pix' },
    { id: uid(), date: past(7), description: 'Chocolate no caixa', tag: 'Impulso', amount: 9.9, paymentMethod: 'debito' },
    { id: uid(), date: past(11), description: 'Delivery lanche', tag: 'Delivery', amount: 42, paymentMethod: 'card-week1' },
    { id: uid(), date: past(day), description: 'Sorvete', tag: 'Doce', amount: 12, paymentMethod: 'dinheiro' },
  ]

  s.fuelLogs = [
    { id: uid(), date: past(3), amount: 40, trips: 1, note: 'Consulta pediatra', paymentMethod: 'pix' },
    { id: uid(), date: past(6), amount: 35, trips: 1, note: 'Fisioterapia', paymentMethod: 'pix' },
    { id: uid(), date: past(10), amount: 48, trips: 1, note: 'Consulta especialista', paymentMethod: 'card-main' },
    { id: uid(), date: past(13), amount: 42, trips: 1, note: 'Fisioterapia', paymentMethod: 'pix' },
  ]
  return s
}
