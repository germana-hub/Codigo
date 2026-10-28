import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Lock, Save } from 'lucide-react'
import { useStore } from '../store/AppStore.jsx'
import { CARD_TYPES, FUEL_CATEGORY, INSTALLMENT_CATEGORIES } from '../store/defaults.js'
import { COLLECTION, KIND_LABELS, entryTitle, saveEntry } from '../lib/entries.js'
import { cardById, chargeSchedule, quinzenaOfDay } from '../lib/finance.js'
import { currentMonth, isoInMonth, monthLabel, money, toNumber, todayISO } from '../lib/format.js'
import { paymentOptions } from '../lib/payments.js'
import { Button, Field, Input, Modal, Select, Toggle } from './ui.jsx'

const EditorContext = createContext(null)

function defaultsFor(kind, state, month) {
  const date = month === currentMonth() ? todayISO() : isoInMonth(month, 1)
  const firstCard = state.cards.find((c) => c.type === 'main') || state.cards[0]
  switch (kind) {
    case 'income': return { name: '', amount: '', day: 5, recurring: true, month }
    case 'fixed': return { name: '', amount: '', category: 'Contas de Consumo', dueDay: 10, quinzena: 1, paymentMethod: 'boleto', active: true }
    case 'charge': return { cardId: firstCard?.id || '', description: '', category: 'Mercado/Alimentação', amount: '', installments: 1, date }
    case 'micro': return { date, description: '', tag: state.microTags[0] || 'Outros', amount: '', paymentMethod: 'pix' }
    case 'fuel': return { date, amount: 40, trips: 1, note: 'Consulta médica', paymentMethod: 'pix' }
    case 'card': return { name: '', type: 'main', limit: 1000, closingDay: 1, dueDay: 10, weeklyCap: 0, payQuinzena: 1, color: '#334155' }
    case 'category': return { name: '', limit: 0, color: '#0ea5e9' }
    default: return {}
  }
}

function EntryModal({ kind, entry, defaults, onClose }) {
  const store = useStore()
  const { state, month } = store
  const [form, setForm] = useState(() => (entry ? { ...entry } : { ...defaultsFor(kind, state, month), ...defaults }))
  const [error, setError] = useState(null)
  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e
    setForm((f) => ({ ...f, [key]: value }))
    setError(null)
  }

  const submit = (e) => {
    e.preventDefault()
    const err = saveEntry(store, kind, form, entry?.id ?? null)
    if (err) setError(err)
    else onClose()
  }

  const categories = state.categories.map((c) => ({ value: c.name, label: c.name }))
  const card = kind === 'charge' ? cardById(state, form.cardId) : null
  const locked = card?.type === 'installments'
  const chargeCats = locked ? INSTALLMENT_CATEGORIES.map((n) => ({ value: n, label: n })) : categories

  return (
    <Modal open title={`${entry ? 'Editar' : 'Novo(a)'} ${KIND_LABELS[kind].toLowerCase()}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {kind === 'income' && (
          <>
            <Field label="Descrição"><Input value={form.name} onChange={set('name')} placeholder="Ex.: 1º Pagamento" autoFocus /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor (R$)"><Input type="number" inputMode="decimal" step="0.01" min="0" value={form.amount} onChange={set('amount')} /></Field>
              <Field label="Dia do depósito" hint={`Conta na ${quinzenaOfDay(toNumber(form.day)) === 1 ? '1ª' : '2ª'} quinzena`}><Input type="number" min="1" max="31" value={form.day} onChange={set('day')} /></Field>
            </div>
            <Toggle checked={!!form.recurring} onChange={set('recurring')} label="Recorrente todo mês" />
            {!form.recurring && <Field label="Mês"><Input type="month" value={form.month || month} onChange={set('month')} /></Field>}
          </>
        )}

        {kind === 'fixed' && (
          <>
            <Field label="Descrição"><Input value={form.name} onChange={set('name')} placeholder="Ex.: Energia" autoFocus /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor mensal (R$)"><Input type="number" inputMode="decimal" step="0.01" min="0" value={form.amount} onChange={set('amount')} /></Field>
              <Field label="Dia de vencimento">
                <Input type="number" min="1" max="31" value={form.dueDay} onChange={(e) => setForm((f) => ({ ...f, dueDay: e.target.value, quinzena: quinzenaOfDay(toNumber(e.target.value)) }))} />
              </Field>
              <Field label="Categoria"><Select value={form.category} onChange={set('category')} options={categories} /></Field>
              <Field label="Pagar com a"><Select value={form.quinzena} onChange={set('quinzena')} options={[{ value: 1, label: '1ª Quinzena' }, { value: 2, label: '2ª Quinzena' }]} /></Field>
            </div>
            <Field label="Forma de pagamento" hint="Se for cartão, entra na fatura daquele cartão."><Select value={form.paymentMethod} onChange={set('paymentMethod')} options={paymentOptions(state, { excludeTypes: ['emergency'] })} /></Field>
            <Toggle checked={form.active !== false} onChange={set('active')} label="Ativa" />
          </>
        )}

        {kind === 'charge' && (
          <>
            <Field label="Cartão">
              <Select
                value={form.cardId}
                onChange={(e) => {
                  const next = cardById(state, e.target.value)
                  setForm((f) => ({ ...f, cardId: e.target.value, category: next?.type === 'installments' && !INSTALLMENT_CATEGORIES.includes(f.category) ? INSTALLMENT_CATEGORIES[0] : f.category }))
                  setError(null)
                }}
                options={state.cards.map((c) => ({ value: c.id, label: `${c.name} — ${CARD_TYPES[c.type]?.label}` }))}
              />
            </Field>
            {locked && (
              <div className="flex gap-2 rounded-xl bg-teal-50 p-3 text-xs text-teal-900 ring-1 ring-teal-200">
                <Lock className="h-4 w-4 shrink-0" /> Cartão exclusivo para parcelas de manutenção do carro e reforma da casa. Compras gerais bloqueadas.
              </div>
            )}
            {card?.type === 'weekly' && <p className="text-xs text-amber-700">Teto semanal: {money(card.weeklyCap)} (bloqueio rígido).</p>}
            {card?.type === 'emergency' && !state.settings.emergencyMode && <p className="text-xs text-red-700">Cartão de emergência: fora do orçamento até ativar o modo emergência.</p>}
            <Field label="Descrição"><Input value={form.description} onChange={set('description')} placeholder="Ex.: Mercado" autoFocus /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor total (R$)"><Input type="number" inputMode="decimal" step="0.01" min="0" value={form.amount} onChange={set('amount')} /></Field>
              <Field label="Parcelas"><Input type="number" min="1" max="72" value={form.installments} onChange={set('installments')} /></Field>
              <Field label="Data da compra"><Input type="date" value={form.date} onChange={set('date')} /></Field>
              <Field label="Categoria"><Select value={form.category} onChange={set('category')} options={chargeCats} /></Field>
            </div>
            {card && toNumber(form.amount) > 0 && (() => {
              const s = chargeSchedule({ ...form, amount: toNumber(form.amount) }, card)
              return <p className="text-xs text-slate-500">{s.n}x de {money(s.per)} · 1ª fatura: {monthLabel(s.first)}{s.n > 1 ? ` · última: ${monthLabel(s.last)}` : ''}</p>
            })()}
          </>
        )}

        {kind === 'micro' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor (R$)"><Input type="number" inputMode="decimal" step="0.01" min="0" value={form.amount} onChange={set('amount')} autoFocus /></Field>
              <Field label="Data"><Input type="date" value={form.date} onChange={set('date')} /></Field>
              <Field label="Tipo"><Select value={form.tag} onChange={set('tag')} options={state.microTags.map((t) => ({ value: t, label: t }))} /></Field>
              <Field label="Pagamento"><Select value={form.paymentMethod} onChange={set('paymentMethod')} options={paymentOptions(state, { excludeTypes: ['installments'] })} /></Field>
            </div>
            <Field label="Descrição (opcional)"><Input value={form.description} onChange={set('description')} placeholder="Ex.: Café" /></Field>
          </>
        )}

        {kind === 'fuel' && (
          <>
            <Field label="Valor (R$)" hint={`Faixa esperada por viagem: ${money(state.settings.fuelCostMin)} a ${money(state.settings.fuelCostMax)}`}>
              <div className="flex gap-2">
                <Input type="number" inputMode="decimal" step="0.01" min="0" value={form.amount} onChange={set('amount')} />
                {[30, 40, 50].map((v) => <Button key={v} variant="soft" size="sm" onClick={() => set('amount')(v)}>{v}</Button>)}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data"><Input type="date" value={form.date} onChange={set('date')} /></Field>
              <Field label="Nº de viagens"><Input type="number" min="1" max="14" value={form.trips} onChange={set('trips')} /></Field>
            </div>
            <Field label="Observação"><Input value={form.note} onChange={set('note')} placeholder="Ex.: Fisioterapia" /></Field>
            <Field label="Pagamento"><Select value={form.paymentMethod} onChange={set('paymentMethod')} options={paymentOptions(state, { excludeTypes: ['installments'] })} /></Field>
            <p className="text-xs text-slate-500">Categoria: {FUEL_CATEGORY}</p>
          </>
        )}

        {kind === 'card' && (
          <>
            <Field label="Nome"><Input value={form.name} onChange={set('name')} autoFocus /></Field>
            <Field label="Tipo" hint={CARD_TYPES[form.type]?.description}>
              <Select value={form.type} onChange={set('type')} options={Object.entries(CARD_TYPES).map(([value, t]) => ({ value, label: t.label }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Limite (R$)"><Input type="number" step="0.01" min="0" value={form.limit} onChange={set('limit')} /></Field>
              <Field label="Cor"><Input type="color" value={form.color} onChange={set('color')} className="h-[38px] p-1" /></Field>
              <Field label="Dia de fechamento"><Input type="number" min="1" max="31" value={form.closingDay} onChange={set('closingDay')} /></Field>
              <Field label="Dia de vencimento"><Input type="number" min="1" max="31" value={form.dueDay} onChange={set('dueDay')} /></Field>
              <Field label="Fatura paga com a"><Select value={form.payQuinzena} onChange={set('payQuinzena')} options={[{ value: 1, label: '1ª Quinzena' }, { value: 2, label: '2ª Quinzena' }]} /></Field>
              {form.type === 'weekly' && <Field label="Teto semanal (R$)"><Input type="number" step="0.01" min="0" value={form.weeklyCap} onChange={set('weeklyCap')} /></Field>}
            </div>
          </>
        )}

        {kind === 'category' && (
          <>
            <Field label="Nome"><Input value={form.name} onChange={set('name')} autoFocus /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Limite mensal (R$)" hint="0 = sem limite"><Input type="number" step="0.01" min="0" value={form.limit} onChange={set('limit')} /></Field>
              <Field label="Cor"><Input type="color" value={form.color} onChange={set('color')} className="h-[38px] p-1" /></Field>
            </div>
          </>
        )}

        {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" icon={Save}>Salvar</Button>
        </div>
      </form>
    </Modal>
  )
}

export function EditorProvider({ children }) {
  const store = useStore()
  const [editor, setEditor] = useState(null)
  const { state, remove } = store

  const openEditor = useCallback((kind, entry = null, defaults = {}) => setEditor({ kind, entry, defaults, key: Date.now() }), [])
  const close = useCallback(() => setEditor(null), [])

  const confirmDelete = useCallback(
    (kind, entry) => {
      if (kind === 'card') {
        const used = state.charges.some((c) => c.cardId === entry.id) || [...state.fixedExpenses, ...state.microExpenses, ...state.fuelLogs].some((x) => x.paymentMethod === entry.id)
        if (used) {
          window.alert(`"${entry.name}" possui lançamentos vinculados. Exclua ou mova esses lançamentos antes de remover o cartão.`)
          return
        }
      }
      if (window.confirm(`Excluir "${entryTitle(kind, entry)}"?`)) remove(COLLECTION[kind], entry.id)
    },
    [state, remove],
  )

  const value = useMemo(() => ({ openEditor, confirmDelete }), [openEditor, confirmDelete])
  return (
    <EditorContext.Provider value={value}>
      {children}
      {editor && <EntryModal key={editor.key} kind={editor.kind} entry={editor.entry} defaults={editor.defaults} onClose={close} />}
    </EditorContext.Provider>
  )
}

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor deve ser usado dentro de EditorProvider')
  return ctx
}
