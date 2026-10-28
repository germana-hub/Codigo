import { useMemo, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Car, Droplets, Fuel, Plus, Stethoscope, Zap } from 'lucide-react'
import { useStore } from '../store/AppStore.jsx'
import { fuelStats, microStats } from '../lib/finance.js'
import { saveEntry } from '../lib/entries.js'
import { currentMonth, isoInMonth, money, pct, shortDate, todayISO } from '../lib/format.js'
import { Badge, Button, EmptyState, Gauge, Input, Panel, Select, Stat } from '../components/ui.jsx'
import { RowActions } from '../components/common.jsx'
import { useEditor } from '../components/Editor.jsx'
import { paymentLabel, paymentOptions } from '../lib/payments.js'
import { cx } from '../lib/style.js'

const TAG_COLORS = ['#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#0ea5e9', '#14b8a6', '#64748b']

function QuickMicro() {
  const store = useStore()
  const { state, month } = store
  const [amount, setAmount] = useState('')
  const [tag, setTag] = useState(state.microTags[0] || 'Outros')
  const [description, setDescription] = useState('')
  const [method, setMethod] = useState('pix')
  const [msg, setMsg] = useState(null)
  const ref = useRef(null)

  const submit = (e) => {
    e.preventDefault()
    const date = month === currentMonth() ? todayISO() : isoInMonth(month, 1)
    const err = saveEntry(store, 'micro', { amount, tag, description, paymentMethod: method, date })
    if (err) return setMsg({ tone: 'red', text: err })
    setMsg({ tone: 'green', text: `Gotinha de ${money(amount)} registrada.` })
    setAmount('')
    setDescription('')
    ref.current?.focus()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        <Input ref={ref} type="number" inputMode="decimal" step="0.01" min="0" placeholder="R$ 0,00" value={amount} onChange={(e) => { setAmount(e.target.value); setMsg(null) }} className="text-lg font-semibold" aria-label="Valor" />
        <Button type="submit" icon={Plus} variant="success">Lançar</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[5, 10, 15, 20, 30].map((v) => <Button key={v} size="sm" variant="soft" onClick={() => setAmount(String(v))}>R$ {v}</Button>)}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {state.microTags.map((t) => (
          <button key={t} type="button" onClick={() => setTag(t)} className={cx('rounded-full px-3 py-1 text-xs font-medium ring-1 transition', tag === t ? 'bg-amber-500 text-white ring-amber-500' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50')}>{t}</button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Select value={method} onChange={(e) => setMethod(e.target.value)} options={paymentOptions(state, { excludeTypes: ['installments'] })} />
      </div>
      {msg && <p role="status" className={msg.tone === 'red' ? 'text-xs text-red-600' : 'text-xs text-emerald-700'}>{msg.text}</p>}
    </form>
  )
}

export default function Micro() {
  const store = useStore()
  const { state, month } = store
  const { openEditor } = useEditor()
  const s = state.settings
  const micro = useMemo(() => microStats(state, month), [state, month])
  const fuel = useMemo(() => fuelStats(state, month), [state, month])
  const [fuelMsg, setFuelMsg] = useState(null)

  const quickFuel = (amount) => {
    const date = month === currentMonth() ? todayISO() : isoInMonth(month, 1)
    const err = saveEntry(store, 'fuel', { amount, trips: 1, note: 'Consulta médica', paymentMethod: 'pix', date })
    setFuelMsg(err ? { tone: 'red', text: err } : { tone: 'green', text: `Viagem de ${money(amount)} registrada (${shortDate(date)}).` })
  }
  const fuelDiff = fuel.actual - fuel.projected.avg
  const weekChart = fuel.weeks.map((w) => ({ name: w.label, Projetado: Math.round(w.projected * 100) / 100, Real: w.actual, max: w.max }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold"><Droplets className="h-5 w-5 text-sky-500" />Gotinha d'Água</h1>
        <p className="text-xs text-slate-500">Auditoria de micro-gastos ("gastos formiguinha") e logística das consultas médicas.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Medidor de vazamento" icon={Droplets}>
          <Gauge value={micro.pctOfIncome} warn={s.microAlertPct} danger={s.microDangerPct} label={pct(micro.pctOfIncome, 2)} sub={`da renda líquida (${money(micro.income)})`} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl bg-slate-50 p-2"><div className="text-slate-500">No mês</div><div className="text-sm font-bold">{money(micro.total)}</div><div className="text-slate-400">{micro.count} gotinha(s)</div></div>
            <div className={cx('rounded-xl p-2', micro.projectedPct >= s.microDangerPct ? 'bg-red-50' : micro.projectedPct >= s.microAlertPct ? 'bg-amber-50' : 'bg-emerald-50')}><div className="text-slate-500">Projeção do mês</div><div className="text-sm font-bold">{money(micro.projected)}</div><div className="text-slate-400">{pct(micro.projectedPct)}</div></div>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-500">Em 12 meses nesse ritmo: <b className="text-red-600">{money(micro.yearly)}</b> · Alerta {pct(s.microAlertPct, 0)} · Crítico {pct(s.microDangerPct, 0)}</p>
        </Panel>

        <Panel title="Lançamento rápido" icon={Zap} className="lg:col-span-2">
          <QuickMicro />
          {micro.byTag.length > 0 && (
            <div className="mt-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={micro.byTag}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="tag" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={40} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Bar dataKey="value" name="Total" radius={[6, 6, 0, 0]}>
                    {micro.byTag.map((t, i) => <Cell key={t.tag} fill={TAG_COLORS[i % TAG_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Gotinhas do mês" icon={Droplets} actions={<Button size="sm" variant="soft" icon={Plus} onClick={() => openEditor('micro')}>Detalhado</Button>}>
        {micro.items.length ? (
          <ul className="divide-y divide-slate-100">
            {micro.items.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{m.description || m.tag}</div>
                  <div className="text-[11px] text-slate-500">{shortDate(m.date)} · <Badge tone="yellow">{m.tag}</Badge> · {paymentLabel(state, m.paymentMethod)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-amber-700">{money(m.amount)}</span>
                  <RowActions kind="micro" entry={m} />
                </div>
              </li>
            ))}
          </ul>
        ) : <EmptyState>Nenhuma gotinha registrada neste mês. 💧</EmptyState>}
      </Panel>

      <div className="flex items-center gap-2 pt-2">
        <Stethoscope className="h-5 w-5 text-teal-600" />
        <h2 className="text-base font-bold">Logística — consultas médicas da filha</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Projetado no mês" value={money(fuel.projected.avg)} icon={Car} tone="blue" sub={`${money(fuel.projected.min)} a ${money(fuel.projected.max)} · ${s.fuelTripsPerWeek}x/semana`} />
        <Stat label="Real no mês" value={money(fuel.actual)} icon={Fuel} tone={fuel.actual > fuel.projected.max ? 'red' : fuel.actual > fuel.projected.avg ? 'yellow' : 'green'} sub={`${fuel.trips} viagem(ns) de ~${Math.round(fuel.projected.trips)} previstas`} />
        <Stat label="Diferença" value={`${fuelDiff > 0 ? '+' : ''}${money(fuelDiff)}`} tone={fuelDiff > 0 ? 'red' : 'green'} sub={fuelDiff > 0 ? 'acima da média projetada' : 'abaixo da média projetada'} />
        <Stat label="Custo médio/viagem" value={money(fuel.avgPerTrip)} tone={fuel.avgPerTrip > s.fuelCostMax ? 'red' : 'slate'} sub={`Faixa ${money(s.fuelCostMin)}–${money(s.fuelCostMax)}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Registrar viagem" icon={Car}>
          <p className="mb-2 text-xs text-slate-500">Um toque registra 1 viagem hoje (Pix).</p>
          <div className="grid grid-cols-3 gap-2">
            {[30, 40, 50].map((v) => <Button key={v} variant="soft" className="py-4 text-base" onClick={() => quickFuel(v)}>R$ {v}</Button>)}
          </div>
          <Button className="mt-2 w-full" icon={Plus} onClick={() => openEditor('fuel')}>Outro valor / detalhes</Button>
          {fuelMsg && <p role="status" className={fuelMsg.tone === 'red' ? 'mt-2 text-xs text-red-600' : 'mt-2 text-xs text-emerald-700'}>{fuelMsg.text}</p>}
        </Panel>

        <Panel title="Consolidação semanal: projetado × real" icon={Fuel} className="lg:col-span-2">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={36} />
                <Tooltip formatter={(v) => money(v)} />
                <Legend />
                <Bar dataKey="Projetado" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Real" fill="#14b8a6" radius={[6, 6, 0, 0]}>
                  {weekChart.map((w) => <Cell key={w.name} fill={w.Real > w.max ? '#ef4444' : w.Real > w.Projetado ? '#f59e0b' : '#14b8a6'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-500"><tr className="text-left"><th className="py-1">Semana</th><th>Viagens</th><th>Projetado</th><th>Real</th><th>Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {fuel.weeks.map((w) => (
                  <tr key={w.start}>
                    <td className="py-1.5">Dias {w.label}</td>
                    <td>{w.trips} / {Math.round(w.plannedTrips * 10) / 10}</td>
                    <td>{money(w.projected)}</td>
                    <td className="font-semibold">{money(w.actual)}</td>
                    <td>{w.actual > w.max ? <Badge tone="red">Acima</Badge> : w.actual > w.projected ? <Badge tone="yellow">Atenção</Badge> : <Badge tone="green">OK</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title="Histórico de combustível (mês)" icon={Fuel}>
        {fuel.logs.length ? (
          <ul className="divide-y divide-slate-100">
            {fuel.logs.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{f.note || 'Consulta médica'}</div>
                  <div className="text-[11px] text-slate-500">{shortDate(f.date)} · {f.trips || 1} viagem(ns) · {paymentLabel(state, f.paymentMethod)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cx('text-sm font-semibold', f.amount / (f.trips || 1) > s.fuelCostMax ? 'text-red-600' : 'text-teal-700')}>{money(f.amount)}</span>
                  <RowActions kind="fuel" entry={f} />
                </div>
              </li>
            ))}
          </ul>
        ) : <EmptyState>Nenhuma viagem registrada neste mês.</EmptyState>}
      </Panel>
    </div>
  )
}
