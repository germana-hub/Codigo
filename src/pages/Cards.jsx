import { useMemo, useState } from 'react'
import { CalendarRange, CreditCard, Lock, Pencil, Plus, Receipt, Siren, Trash2 } from 'lucide-react'
import { useStore } from '../store/AppStore.jsx'
import { CARD_TYPES } from '../store/defaults.js'
import { cardSummary, cardWeekSpend, chargeSchedule, weeksOfMonth } from '../lib/finance.js'
import { monthDiff, monthLabel, money, pct, shortDate } from '../lib/format.js'
import { Badge, Button, EmptyState, Panel, ProgressBar, Toggle } from '../components/ui.jsx'
import { toneFor } from '../lib/style.js'
import { CardVisual, RowActions } from '../components/common.jsx'
import { useEditor } from '../components/Editor.jsx'

export default function Cards() {
  const { state, month, setSettings } = useStore()
  const { openEditor, confirmDelete } = useEditor()
  const s = state.settings
  const summaries = useMemo(() => state.cards.map((c) => cardSummary(state, c, month)), [state, month])
  const [selectedId, setSelectedId] = useState(state.cards[0]?.id ?? null)
  const sel = summaries.find((x) => x.card.id === selectedId) || summaries[0]
  const totalDebt = summaries.filter((x) => x.counted).reduce((a, x) => a + x.debt, 0)
  const totalBill = summaries.filter((x) => x.counted).reduce((a, x) => a + x.bill, 0)

  const charges = sel ? state.charges.filter((c) => c.cardId === sel.card.id).sort((a, b) => (a.date < b.date ? 1 : -1)) : []
  const weeks = sel?.card.type === 'weekly' ? weeksOfMonth(month).map((w) => ({ ...w, spent: cardWeekSpend(state, sel.card, w.start) })) : []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold">Cartões de crédito</h1>
          <p className="text-xs text-slate-500">Dívida total no orçamento: <b>{money(totalDebt)}</b> · Faturas de {monthLabel(month)}: <b>{money(totalBill)}</b></p>
        </div>
        <div className="flex gap-2">
          <Button variant="soft" icon={Plus} onClick={() => openEditor('card')}>Cartão</Button>
          <Button icon={Plus} onClick={() => openEditor('charge', null, sel ? { cardId: sel.card.id, category: sel.card.type === 'installments' ? 'Manutenção Carro' : 'Mercado/Alimentação' } : {})}>Compra</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaries.map((cs) => (
          <CardVisual key={cs.card.id} summary={cs} selected={sel?.card.id === cs.card.id} onClick={() => setSelectedId(cs.card.id)} warnPct={s.cardWarnPct} dangerPct={s.cardDangerPct} />
        ))}
      </div>

      {sel && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel
            title={sel.card.name}
            icon={CreditCard}
            actions={
              <>
                <Button size="sm" variant="soft" icon={Pencil} onClick={() => openEditor('card', sel.card)}>Editar</Button>
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => confirmDelete('card', sel.card)}>Excluir</Button>
              </>
            }
          >
            <p className="text-xs text-slate-500">{CARD_TYPES[sel.card.type]?.description}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {[
                ['Limite', money(sel.limit)],
                ['Disponível', money(sel.available)],
                ['Fechamento', `Dia ${sel.card.closingDay}`],
                ['Vencimento', `Dia ${sel.card.dueDay}`],
                ['Fatura do mês', money(sel.bill)],
                ['Paga com a', `${sel.card.payQuinzena}ª Quinzena`],
                ['Dívida acumulada', money(sel.debt)],
                ['Quitação', sel.lastMonth ? `${sel.payoffMonths} mês(es) · ${monthLabel(sel.lastMonth)}` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 p-2">
                  <dt className="text-[11px] text-slate-500">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <ProgressBar className="mt-3" value={sel.usagePct} tone={toneFor(sel.usagePct, s.cardWarnPct, s.cardDangerPct)} />
            <p className="mt-1 text-[11px] text-slate-500">{pct(sel.usagePct, 0)} do limite comprometido</p>

            {sel.card.type === 'installments' && (
              <div className="mt-3 flex gap-2 rounded-xl bg-teal-50 p-3 text-xs text-teal-900 ring-1 ring-teal-200">
                <Lock className="h-4 w-4 shrink-0" /> Novas compras gerais bloqueadas. Apenas parcelas de Manutenção Carro e Reforma Casa são aceitas.
              </div>
            )}
            {sel.card.type === 'emergency' && (
              <div className="mt-3 space-y-2 rounded-xl bg-red-50 p-3 text-xs text-red-900 ring-1 ring-red-200">
                <div className="flex gap-2"><Siren className="h-4 w-4 shrink-0" /> Reserva estratégica. Só entra no orçamento mensal com o modo emergência ativo.</div>
                <Toggle tone="red" checked={!!s.emergencyMode} onChange={(v) => setSettings({ emergencyMode: v })} label="Modo emergência" />
              </div>
            )}
            {sel.card.type === 'weekly' && (
              <div className="mt-3">
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500"><CalendarRange className="h-3.5 w-3.5" />Teto semanal: {money(sel.weekCap)}</h3>
                <ul className="space-y-2">
                  {weeks.map((w) => {
                    const p = sel.weekCap > 0 ? (w.spent / sel.weekCap) * 100 : 0
                    return (
                      <li key={w.start}>
                        <div className="flex justify-between text-xs"><span>Semana {shortDate(w.start)}–{shortDate(w.end)}</span><span className={p > 100 ? 'font-semibold text-red-600' : ''}>{money(w.spent)}</span></div>
                        <ProgressBar value={p} tone={toneFor(p, 70, 100)} />
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </Panel>

          <Panel title={`Fatura de ${monthLabel(month)}`} icon={Receipt} className="lg:col-span-2" actions={<Badge tone="blue">{money(sel.bill)}</Badge>}>
            {sel.items.length ? (
              <ul className="divide-y divide-slate-100">
                {sel.items.map((it) => (
                  <li key={`${it.kind}-${it.entry.id}`} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{it.label} {it.installmentLabel && <Badge tone={it.installmentLabel === 'recorrente' ? 'violet' : 'slate'}>{it.installmentLabel}</Badge>}</div>
                      <div className="text-[11px] text-slate-500">{shortDate(it.date)} · {it.category}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold">{money(it.amount)}</span>
                      <RowActions kind={it.kind} entry={it.entry} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : <EmptyState>Nenhum lançamento nesta fatura.</EmptyState>}

            <h3 className="mb-1 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Compras e parcelamentos</h3>
            {charges.length ? (
              <ul className="divide-y divide-slate-100">
                {charges.map((ch) => {
                  const sc = chargeSchedule(ch, sel.card)
                  const paid = Math.max(0, Math.min(sc.n, monthDiff(sc.first, month)))
                  const remaining = (sc.n - paid) * sc.per
                  return (
                    <li key={ch.id} className="py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{ch.description}</div>
                          <div className="text-[11px] text-slate-500">{shortDate(ch.date)} · {ch.category} · {sc.n}x {money(sc.per)} · {monthLabel(sc.first)} → {monthLabel(sc.last)}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="text-right">
                            <div className="text-sm font-semibold">{money(ch.amount)}</div>
                            <div className="text-[11px] text-slate-500">resta {money(remaining)}</div>
                          </div>
                          <RowActions kind="charge" entry={ch} />
                        </div>
                      </div>
                      {sc.n > 1 && <ProgressBar className="mt-1" value={(paid / sc.n) * 100} tone="blue" />}
                    </li>
                  )
                })}
              </ul>
            ) : <EmptyState>Nenhuma compra registrada neste cartão.</EmptyState>}
          </Panel>
        </div>
      )}
    </div>
  )
}
