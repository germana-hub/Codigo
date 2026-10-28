import { useMemo } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CreditCard, Droplets, Fuel, Lightbulb, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { useStore } from '../store/AppStore.jsx'
import { PERIOD_LABELS, cardSummary, categorySpend, computeBudget, fuelStats, microStats } from '../lib/finance.js'
import { generateInsights } from '../lib/insights.js'
import { money, pct } from '../lib/format.js'
import { EmptyState, Gauge, Panel, ProgressBar, Stat } from '../components/ui.jsx'
import { toneFor } from '../lib/style.js'
import { InsightList, PeriodToggle } from '../components/common.jsx'

const tooltipMoney = (v) => money(v)

export default function Dashboard({ goTo }) {
  const { state, month, period } = useStore()
  const s = state.settings
  const budget = useMemo(() => computeBudget(state, month, period), [state, month, period])
  const cats = useMemo(() => categorySpend(state, month).filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent), [state, month])
  const cards = useMemo(() => state.cards.map((c) => cardSummary(state, c, month)), [state, month])
  const micro = useMemo(() => microStats(state, month), [state, month])
  const fuel = useMemo(() => fuelStats(state, month), [state, month])
  const insights = useMemo(() => generateInsights(state, month), [state, month])

  const usedPct = budget.income > 0 ? (budget.outflow / budget.income) * 100 : 0
  const composition = [
    { name: 'Despesas fixas', value: budget.fixed, color: '#6366f1' },
    { name: 'Faturas de cartão', value: budget.cards, color: '#0ea5e9' },
    { name: 'Gotinhas (diretas)', value: budget.micro, color: '#f59e0b' },
    { name: 'Combustível (direto)', value: budget.fuel, color: '#14b8a6' },
    { name: 'Saldo livre', value: Math.max(0, budget.balance), color: '#22c55e' },
  ].filter((x) => x.value > 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold">Visão geral</h1>
          <p className="text-xs text-slate-500">{PERIOD_LABELS[period]}{state.settings.emergencyMode && ' · modo emergência ativo'}</p>
        </div>
        <PeriodToggle />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Renda do período" value={money(budget.income)} icon={TrendingUp} tone="blue" sub={`${budget.incomes.length} entrada(s)`} />
        <Stat label="Comprometido" value={money(budget.outflow)} icon={TrendingDown} tone={toneFor(usedPct, 85, 100)} sub={`${pct(usedPct, 0)} da renda`} />
        <Stat label="Saldo livre (não alocado)" value={money(budget.balance)} icon={Wallet} tone={budget.balance >= 0 ? 'green' : 'red'} sub="Renda − saídas lançadas" />
        <Stat label="Previsão fim do período" value={money(budget.forecast)} icon={PiggyBank} tone={budget.forecast >= 0 ? 'green' : 'red'} sub={budget.remainingFuel > 0 ? `Inclui ${money(budget.remainingFuel)} de combustível previsto` : 'Sem projeções pendentes'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Fluxo de caixa (saldo acumulado)" icon={Wallet} className="lg:col-span-2">
          {budget.timeline.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={budget.timeline} margin={{ left: 0, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="saldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={36} />
                  <Tooltip formatter={tooltipMoney} />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
                  <Area type="stepAfter" dataKey="saldo" name="Saldo" stroke="#16a34a" fill="url(#saldo)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState>Sem movimentações no período.</EmptyState>}
        </Panel>

        <Panel title="Destino da renda" icon={PiggyBank}>
          {composition.length ? (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={composition} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {composition.map((c) => <Cell key={c.name} fill={c.color} />)}
                    </Pie>
                    <Tooltip formatter={tooltipMoney} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1 text-xs">
                {composition.map((c) => (
                  <li key={c.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />{c.name}</span>
                    <span className="font-medium">{money(c.value)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : <EmptyState>Nada lançado ainda.</EmptyState>}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Gastos por categoria (mês)" icon={TrendingDown} className="lg:col-span-2">
          {cats.length ? (
            <div style={{ height: Math.max(180, cats.length * 30) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cats} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={tooltipMoney} />
                  <Bar dataKey="spent" name="Gasto" radius={[0, 6, 6, 0]}>
                    {cats.map((c) => <Cell key={c.id} fill={c.limit > 0 && c.spent >= c.limit ? '#ef4444' : c.limit > 0 && c.spent >= c.limit * (s.categoryWarnPct / 100) ? '#f59e0b' : c.color} />)}
                  </Bar>
                  <Bar dataKey="limit" name="Limite" fill="#cbd5e1" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState>Sem gastos categorizados.</EmptyState>}
        </Panel>

        <Panel title="Gotinha d'Água" icon={Droplets} actions={<button className="text-xs text-sky-700 hover:underline" onClick={() => goTo('micro')}>Abrir</button>}>
          <Gauge value={micro.pctOfIncome} warn={s.microAlertPct} danger={s.microDangerPct} label={pct(micro.pctOfIncome)} sub={`${money(micro.total)} da renda líquida mensal`} />
          <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs">
            <span className="flex items-center gap-1.5"><Fuel className="h-4 w-4 text-teal-600" />Combustível consultas</span>
            <span className={fuel.actual > fuel.projected.max ? 'font-semibold text-red-600' : 'font-semibold'}>{money(fuel.actual)} / {money(fuel.projected.avg)}</span>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Cartões" icon={CreditCard} actions={<button className="text-xs text-sky-700 hover:underline" onClick={() => goTo('cards')}>Gerenciar</button>}>
          <ul className="space-y-3">
            {cards.map((cs) => (
              <li key={cs.card.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium"><span className="h-3 w-3 rounded-full" style={{ background: cs.card.color }} />{cs.card.name}{!cs.counted && <span className="text-[10px] text-slate-400">(fora do orçamento)</span>}</span>
                  <span className="text-xs text-slate-500">{money(cs.debt)} / {money(cs.limit)}</span>
                </div>
                <ProgressBar className="mt-1" value={cs.usagePct} tone={toneFor(cs.usagePct, s.cardWarnPct, s.cardDangerPct)} />
                <div className="mt-0.5 flex justify-between text-[11px] text-slate-500">
                  <span>Fatura do mês: {money(cs.bill)} (vence dia {cs.card.dueDay})</span>
                  <span>{pct(cs.usagePct, 0)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Alertas & sugestões" icon={Lightbulb}>
          <InsightList items={insights} limit={7} />
        </Panel>
      </div>
    </div>
  )
}
