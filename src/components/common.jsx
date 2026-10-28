import { CalendarRange, CircleCheck, CreditCard, Droplet, Fuel, Info, Lightbulb, Lock, Pencil, Siren, Tag, TrendingDown, TriangleAlert, Trash2, Wallet } from 'lucide-react'
import { useStore } from '../store/AppStore.jsx'
import { CARD_TYPES } from '../store/defaults.js'
import { money, pct } from '../lib/format.js'
import { cx, toneFor } from '../lib/style.js'
import { Badge, IconButton, ProgressBar, Segmented } from './ui.jsx'
import { useEditor } from './Editor.jsx'

export function PeriodToggle({ className }) {
  const { period, setPeriod } = useStore()
  return (
    <Segmented
      className={cx('w-full sm:w-auto', className)}
      value={period}
      onChange={setPeriod}
      options={[
        { value: 'month', label: 'Mês' },
        { value: 'q1', label: '1ª Quinzena' },
        { value: 'q2', label: '2ª Quinzena' },
      ]}
    />
  )
}

export function RowActions({ kind, entry, className }) {
  const { openEditor, confirmDelete } = useEditor()
  return (
    <div className={cx('flex shrink-0 items-center', className)}>
      <IconButton icon={Pencil} label="Editar" onClick={() => openEditor(kind, entry)} />
      <IconButton icon={Trash2} label="Excluir" tone="red" onClick={() => confirmDelete(kind, entry)} />
    </div>
  )
}

const INSIGHT_STYLE = {
  danger: { box: 'bg-red-50 ring-red-200', text: 'text-red-800', Icon: TriangleAlert, iconCls: 'text-red-600' },
  warn: { box: 'bg-amber-50 ring-amber-200', text: 'text-amber-900', Icon: TriangleAlert, iconCls: 'text-amber-500' },
  info: { box: 'bg-sky-50 ring-sky-200', text: 'text-sky-900', Icon: Info, iconCls: 'text-sky-600' },
  ok: { box: 'bg-emerald-50 ring-emerald-200', text: 'text-emerald-900', Icon: CircleCheck, iconCls: 'text-emerald-600' },
}
const INSIGHT_ICONS = { card: CreditCard, week: CalendarRange, siren: Siren, category: Tag, drop: Droplet, fuel: Fuel, balance: Wallet, tip: Lightbulb, ok: CircleCheck, debt: TrendingDown }

export function InsightList({ items, limit }) {
  const list = limit ? items.slice(0, limit) : items
  return (
    <ul className="space-y-2">
      {list.map((it, i) => {
        const st = INSIGHT_STYLE[it.level]
        const Icon = (it.level === 'danger' || it.level === 'warn' ? st.Icon : INSIGHT_ICONS[it.icon]) || st.Icon
        return (
          <li key={i} className={cx('flex gap-3 rounded-xl p-3 ring-1', st.box)}>
            <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', st.iconCls)} />
            <div className={cx('text-sm', st.text)}>
              <div className="font-semibold">{it.title}</div>
              <div className="text-xs opacity-90">{it.text}</div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function CardVisual({ summary, selected, onClick, warnPct = 60, dangerPct = 80 }) {
  const { card } = summary
  const TypeIcon = card.type === 'installments' ? Lock : card.type === 'emergency' ? Siren : card.type === 'weekly' ? CalendarRange : CreditCard
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'relative w-full overflow-hidden rounded-2xl p-4 text-left text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg',
        selected ? 'ring-4 ring-sky-400 ring-offset-2' : '',
        !summary.counted && 'opacity-80',
      )}
      style={{ background: `linear-gradient(135deg, ${card.color || '#334155'} 0%, #0f172a 110%)` }}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-white/70">{CARD_TYPES[card.type]?.label}</div>
          <div className="text-base font-semibold">{card.name}</div>
        </div>
        <TypeIcon className="h-5 w-5 text-white/80" />
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-[11px] text-white/70">Dívida acumulada</div>
          <div className="text-xl font-bold">{money(summary.debt)}</div>
        </div>
        <div className="text-right text-[11px] text-white/80">
          <div>Limite {money(summary.limit)}</div>
          <div>Disponível <span className={summary.available < 0 ? 'font-bold text-red-300' : 'font-semibold'}>{money(summary.available)}</span></div>
        </div>
      </div>
      <ProgressBar className="mt-2 bg-white/20" value={summary.usagePct} tone={toneFor(summary.usagePct, warnPct, dangerPct)} />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] text-white/80">
        <span>Fecha dia {card.closingDay} · Vence dia {card.dueDay}</span>
        <span>{pct(summary.usagePct, 0)} usado</span>
      </div>
      {card.type === 'weekly' && summary.weekCap > 0 && (
        <div className="mt-2 rounded-lg bg-black/20 p-2 text-[11px]">
          <div className="flex justify-between"><span>Semana atual</span><span>{money(summary.weekSpend)} / {money(summary.weekCap)}</span></div>
          <ProgressBar className="mt-1 bg-white/20" value={summary.weekPct} tone={toneFor(summary.weekPct, 70, 100)} />
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        {card.type === 'installments' && <Badge tone="slate" className="bg-white/90">Compras gerais bloqueadas</Badge>}
        {card.type === 'emergency' && <Badge tone={summary.counted ? 'red' : 'slate'} className="bg-white/90">{summary.counted ? 'No orçamento (emergência)' : 'Fora do orçamento'}</Badge>}
        <Badge tone="slate" className="bg-white/90">Fatura do mês {money(summary.bill)}</Badge>
      </div>
    </button>
  )
}
