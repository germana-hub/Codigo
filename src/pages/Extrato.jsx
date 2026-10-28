import { useMemo, useState } from 'react'
import { Check, Pencil, Plus, ReceiptText, Search, SquarePen, Trash2, X } from 'lucide-react'
import { useStore } from '../store/AppStore.jsx'
import { FUEL_CATEGORY, MICRO_CATEGORY } from '../store/defaults.js'
import { cardById, installmentAt } from '../lib/finance.js'
import { KIND_LABELS, saveEntry } from '../lib/entries.js'
import { monthLabel, monthOf, money, shortDate } from '../lib/format.js'
import { Badge, Button, EmptyState, IconButton, Input, Panel, Segmented, Select } from '../components/ui.jsx'
import { paymentLabel } from '../lib/payments.js'
import { useEditor } from '../components/Editor.jsx'

const FIELDS = {
  income: { desc: 'name', date: 'day', cat: null },
  fixed: { desc: 'name', date: 'dueDay', cat: 'category' },
  charge: { desc: 'description', date: 'date', cat: 'category' },
  micro: { desc: 'description', date: 'date', cat: 'tag' },
  fuel: { desc: 'note', date: 'date', cat: null },
}
const KIND_TONE = { income: 'green', fixed: 'violet', charge: 'blue', micro: 'yellow', fuel: 'slate' }

function buildRows(state, month, scope) {
  const inScope = (pred) => scope === 'all' || pred()
  const rows = []
  for (const i of state.incomes) if (inScope(() => i.recurring || i.month === month)) rows.push({ kind: 'income', entry: i, desc: i.name, amount: i.amount, sign: 1, when: `Dia ${i.day}`, sort: `${month}-${String(i.day).padStart(2, '0')}`, cat: i.recurring ? 'Recorrente' : `Avulsa ${i.month}`, method: '—' })
  for (const f of state.fixedExpenses) if (inScope(() => f.active)) rows.push({ kind: 'fixed', entry: f, desc: f.name, amount: f.amount, sign: -1, when: `Dia ${f.dueDay}`, sort: `${month}-${String(f.dueDay).padStart(2, '0')}`, cat: f.category, method: paymentLabel(state, f.paymentMethod) })
  for (const c of state.charges) {
    const card = cardById(state, c.cardId)
    const inst = card ? installmentAt(c, card, month) : null
    if (!inScope(() => monthOf(c.date) === month || inst)) continue
    rows.push({ kind: 'charge', entry: c, desc: c.description, amount: scope === 'month' && inst ? inst.per : c.amount, sign: -1, when: shortDate(c.date), sort: c.date, cat: c.category, method: card?.name || '—', extra: c.installments > 1 ? (scope === 'month' && inst ? `parcela ${inst.number}/${inst.n}` : `${c.installments}x`) : null })
  }
  for (const m of state.microExpenses) if (inScope(() => monthOf(m.date) === month)) rows.push({ kind: 'micro', entry: m, desc: m.description || m.tag, amount: m.amount, sign: -1, when: shortDate(m.date), sort: m.date, cat: `${MICRO_CATEGORY} · ${m.tag}`, method: paymentLabel(state, m.paymentMethod) })
  for (const f of state.fuelLogs) if (inScope(() => monthOf(f.date) === month)) rows.push({ kind: 'fuel', entry: f, desc: f.note || 'Consulta médica', amount: f.amount, sign: -1, when: shortDate(f.date), sort: f.date, cat: FUEL_CATEGORY, method: paymentLabel(state, f.paymentMethod) })
  return rows.sort((a, b) => (a.sort < b.sort ? 1 : -1))
}

function InlineEditor({ row, onDone }) {
  const store = useStore()
  const { state } = store
  const f = FIELDS[row.kind]
  const [draft, setDraft] = useState({ desc: row.entry[f.desc] ?? '', amount: row.entry.amount ?? '', date: row.entry[f.date] ?? '', cat: f.cat ? row.entry[f.cat] ?? '' : '' })
  const [error, setError] = useState(null)
  const catOptions = row.kind === 'micro' ? state.microTags : state.categories.map((c) => c.name)

  const save = () => {
    const patch = { ...row.entry, [f.desc]: draft.desc, amount: draft.amount, [f.date]: draft.date }
    if (f.cat) patch[f.cat] = draft.cat
    const err = saveEntry(store, row.kind, patch, row.entry.id)
    if (err) setError(err)
    else onDone()
  }
  const onKey = (e) => {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') onDone()
  }

  return (
    <div className="rounded-xl bg-sky-50 p-3 ring-1 ring-sky-200" onKeyDown={onKey}>
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1.5fr_auto]">
        <Input value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} aria-label="Descrição" autoFocus />
        <Input type="number" step="0.01" min="0" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} aria-label="Valor" />
        {f.date === 'date'
          ? <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} aria-label="Data" />
          : <Input type="number" min="1" max="31" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} aria-label="Dia" />}
        {f.cat ? (
          <Select value={draft.cat} onChange={(e) => setDraft({ ...draft, cat: e.target.value })} aria-label="Categoria">
            {!catOptions.includes(draft.cat) && draft.cat && <option value={draft.cat}>{draft.cat}</option>}
            {catOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        ) : <div className="hidden sm:block" />}
        <div className="flex items-center gap-1">
          <IconButton icon={Check} tone="green" label="Salvar" onClick={save} />
          <IconButton icon={X} label="Cancelar" onClick={onDone} />
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default function Extrato() {
  const { state, month } = useStore()
  const { openEditor, confirmDelete } = useEditor()
  const [scope, setScope] = useState('month')
  const [kind, setKind] = useState('all')
  const [query, setQuery] = useState('')
  const [editingKey, setEditingKey] = useState(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return buildRows(state, month, scope).filter((r) => (kind === 'all' || r.kind === kind) && (!q || `${r.desc} ${r.cat} ${r.method}`.toLowerCase().includes(q)))
  }, [state, month, scope, kind, query])
  const inflow = rows.filter((r) => r.sign > 0).reduce((a, r) => a + (Number(r.amount) || 0), 0)
  const outflow = rows.filter((r) => r.sign < 0).reduce((a, r) => a + (Number(r.amount) || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold">Extrato & edição</h1>
          <p className="text-xs text-slate-500">Todos os lançamentos. Clique no lápis para editar na linha ou no ícone de formulário para edição completa.</p>
        </div>
        <Segmented value={scope} onChange={setScope} options={[{ value: 'month', label: monthLabel(month) }, { value: 'all', label: 'Tudo' }]} />
      </div>

      <Panel
        title={`${rows.length} lançamento(s)`}
        icon={ReceiptText}
        actions={
          <>
            <Badge tone="green">Entradas {money(inflow)}</Badge>
            <Badge tone="red">Saídas {money(outflow)}</Badge>
          </>
        }
      >
        <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input className="pl-9" placeholder="Buscar descrição, categoria, cartão…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={kind} onChange={(e) => setKind(e.target.value)} options={[{ value: 'all', label: 'Todos os tipos' }, ...Object.keys(FIELDS).map((k) => ({ value: k, label: KIND_LABELS[k] }))]} />
          <Select value="" onChange={(e) => e.target.value && openEditor(e.target.value)} options={[{ value: '', label: '+ Novo lançamento' }, ...Object.keys(FIELDS).map((k) => ({ value: k, label: KIND_LABELS[k] }))]} />
        </div>

        {rows.length ? (
          <ul className="space-y-1.5">
            {rows.map((r) => {
              const key = `${r.kind}-${r.entry.id}`
              if (editingKey === key) return <li key={key}><InlineEditor row={r} onDone={() => setEditingKey(null)} /></li>
              return (
                <li key={key} className="flex items-center gap-2 rounded-xl px-1 py-2 hover:bg-slate-50 sm:gap-3 sm:px-2">
                  <div className="w-10 shrink-0 text-center sm:w-12 text-[11px] text-slate-500">{r.when}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{r.desc}</div>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                      <Badge tone={KIND_TONE[r.kind]} className="shrink-0">{KIND_LABELS[r.kind]}</Badge>
                      {r.extra && <Badge className="shrink-0">{r.extra}</Badge>}
                      <span className="truncate text-[11px] text-slate-500">{r.cat} · {r.method}</span>
                    </div>
                  </div>
                  <div className={r.sign > 0 ? 'shrink-0 text-sm font-semibold text-emerald-600' : 'shrink-0 text-sm font-semibold text-slate-800'}>{r.sign > 0 ? '+' : '−'}{money(r.amount)}</div>
                  <div className="flex shrink-0 items-center">
                    <IconButton icon={Pencil} label="Editar na linha" onClick={() => setEditingKey(key)} />
                    <IconButton icon={SquarePen} label="Edição completa" onClick={() => openEditor(r.kind, r.entry)} className="hidden sm:inline-flex" />
                    <IconButton icon={Trash2} tone="red" label="Excluir" onClick={() => confirmDelete(r.kind, r.entry)} />
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState>
            Nenhum lançamento encontrado.
            <div className="mt-2"><Button size="sm" icon={Plus} onClick={() => openEditor('micro')}>Adicionar</Button></div>
          </EmptyState>
        )}
      </Panel>
    </div>
  )
}
