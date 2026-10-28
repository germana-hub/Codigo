import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Banknote, CalendarRange, CreditCard, Droplets, Fuel, Plus, Receipt } from 'lucide-react'
import { useStore } from '../store/AppStore.jsx'
import { cardById, computeBudget, isCardMethod } from '../lib/finance.js'
import { money, pct } from '../lib/format.js'
import { Badge, Button, EmptyState, Panel, ProgressBar } from '../components/ui.jsx'
import { toneFor } from '../lib/style.js'
import { PeriodToggle, RowActions } from '../components/common.jsx'
import { useEditor } from '../components/Editor.jsx'

function Row({ title, sub, amount, positive, actions }) {
  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{title}</div>
        {sub && <div className="truncate text-[11px] text-slate-500">{sub}</div>}
      </div>
      <div className="flex items-center gap-1">
        <span className={positive ? 'text-sm font-semibold text-emerald-600' : 'text-sm font-semibold text-slate-800'}>{positive ? '+' : '−'}{money(amount)}</span>
        {actions}
      </div>
    </li>
  )
}

function QuinzenaColumn({ q }) {
  const { state, month } = useStore()
  const { openEditor } = useEditor()
  const period = q === 1 ? 'q1' : 'q2'
  const b = useMemo(() => computeBudget(state, month, period), [state, month, period])
  const usage = b.income > 0 ? (b.outflow / b.income) * 100 : 0

  return (
    <Panel
      title={q === 1 ? '1ª Quinzena — entrada dia 5' : '2ª Quinzena — entrada dia 20'}
      icon={CalendarRange}
      actions={<Badge tone={b.forecast >= 0 ? 'green' : 'red'}>Previsão {money(b.forecast)}</Badge>}
    >
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-sky-50 p-2"><div className="text-[11px] text-slate-500">Renda</div><div className="text-sm font-bold text-sky-700">{money(b.income)}</div></div>
        <div className="rounded-xl bg-slate-50 p-2"><div className="text-[11px] text-slate-500">Saídas</div><div className="text-sm font-bold">{money(b.outflow)}</div></div>
        <div className={b.balance >= 0 ? 'rounded-xl bg-emerald-50 p-2' : 'rounded-xl bg-red-50 p-2'}><div className="text-[11px] text-slate-500">Saldo livre</div><div className={b.balance >= 0 ? 'text-sm font-bold text-emerald-700' : 'text-sm font-bold text-red-700'}>{money(b.balance)}</div></div>
      </div>
      <ProgressBar className="mt-3" value={usage} tone={toneFor(usage, 85, 100)} />
      <p className="mt-1 text-[11px] text-slate-500">{pct(usage, 0)} da renda da quinzena comprometida{b.remainingFuel > 0 && ` · ${money(b.remainingFuel)} de combustível médico ainda previsto`}</p>

      <section className="mt-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500"><Banknote className="h-3.5 w-3.5" />Receitas</h3>
          <Button size="sm" variant="soft" icon={Plus} onClick={() => openEditor('income', null, { day: q === 1 ? 5 : 20 })}>Receita</Button>
        </div>
        {b.incomes.length ? (
          <ul className="divide-y divide-slate-100">
            {b.incomes.map((i) => <Row key={i.id} title={i.name} sub={`Dia ${i.day}${i.recurring ? ' · recorrente' : ' · avulsa'}`} amount={i.amount} positive actions={<RowActions kind="income" entry={i} />} />)}
          </ul>
        ) : <EmptyState>Nenhuma receita nesta quinzena.</EmptyState>}
      </section>

      <section className="mt-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500"><Receipt className="h-3.5 w-3.5" />Despesas fixas (conta/boleto)</h3>
          <Button size="sm" variant="soft" icon={Plus} onClick={() => openEditor('fixed', null, { quinzena: q, dueDay: q === 1 ? 10 : 25 })}>Despesa</Button>
        </div>
        {b.fixedDirect.length ? (
          <ul className="divide-y divide-slate-100">
            {b.fixedDirect.map((f) => <Row key={f.id} title={f.name} sub={`Vence dia ${f.dueDay} · ${f.category}`} amount={f.amount} actions={<RowActions kind="fixed" entry={f} />} />)}
          </ul>
        ) : <EmptyState>Nenhuma despesa fixa direta.</EmptyState>}
      </section>

      <section className="mt-4">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500"><CreditCard className="h-3.5 w-3.5" />Faturas de cartão</h3>
        {b.cardBills.length ? (
          <ul className="divide-y divide-slate-100">
            {b.cardBills.map(({ card, total }) => <Row key={card.id} title={`Fatura ${card.name}`} sub={`Vence dia ${card.dueDay}`} amount={total} />)}
          </ul>
        ) : <EmptyState>Nenhuma fatura paga nesta quinzena.</EmptyState>}
      </section>

      <section className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Variáveis pagas à vista</h3>
        <ul className="divide-y divide-slate-100">
          <Row title={<span className="flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5 text-amber-500" />Gotinhas (Pix/débito/dinheiro)</span>} sub={`${b.microDirect.length} lançamento(s)`} amount={b.micro} />
          <Row title={<span className="flex items-center gap-1.5"><Fuel className="h-3.5 w-3.5 text-teal-600" />Combustível consultas</span>} sub={`${b.fuelDirect.length} lançamento(s)`} amount={b.fuel} />
        </ul>
      </section>
    </Panel>
  )
}

export default function Quinzenas() {
  const { state, month, period } = useStore()
  const q1 = useMemo(() => computeBudget(state, month, 'q1'), [state, month])
  const q2 = useMemo(() => computeBudget(state, month, 'q2'), [state, month])
  const total = useMemo(() => computeBudget(state, month, 'month'), [state, month])
  const chart = [
    { name: '1ª Quinzena', Renda: q1.income, Saídas: q1.outflow, Saldo: q1.balance },
    { name: '2ª Quinzena', Renda: q2.income, Saídas: q2.outflow, Saldo: q2.balance },
    { name: 'Mês', Renda: total.income, Saídas: total.outflow, Saldo: total.balance },
  ]
  const fixedOnCards = state.fixedExpenses.filter((f) => isCardMethod(state, f.paymentMethod))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold">Quinzenas</h1>
          <p className="text-xs text-slate-500">1ª Quinzena: dias 5–19 · 2ª Quinzena: dias 20–fim do mês e 1–4 (inclui bônus do dia 26/27)</p>
        </div>
        <PeriodToggle />
      </div>

      <Panel title="Comparativo do mês" icon={CalendarRange}>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={36} />
              <Tooltip formatter={(v) => money(v)} />
              <Legend />
              <Bar dataKey="Renda" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Saídas" fill="#94a3b8" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Saldo" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className={period === 'month' ? 'grid gap-4 lg:grid-cols-2' : 'grid gap-4'}>
        {period !== 'q2' && <QuinzenaColumn q={1} />}
        {period !== 'q1' && <QuinzenaColumn q={2} />}
      </div>

      <Panel title="Despesas fixas debitadas em cartão" icon={CreditCard}>
        {fixedOnCards.length ? (
          <ul className="divide-y divide-slate-100">
            {fixedOnCards.map((f) => (
              <Row key={f.id} title={f.name} sub={`${cardById(state, f.paymentMethod)?.name} · dia ${f.dueDay} · ${f.category}${f.active ? '' : ' · inativa'}`} amount={f.amount} actions={<RowActions kind="fixed" entry={f} />} />
            ))}
          </ul>
        ) : <EmptyState>Nenhuma assinatura/conta no cartão.</EmptyState>}
      </Panel>
    </div>
  )
}
