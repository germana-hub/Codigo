import { useEffect } from 'react'
import { X } from 'lucide-react'

import { cx, toneFor } from '../lib/style.js'

const TONE_TEXT = { green: 'text-emerald-600', red: 'text-red-600', yellow: 'text-amber-600', slate: 'text-slate-900', blue: 'text-sky-600' }
const TONE_BAR = { green: 'bg-emerald-500', red: 'bg-red-500', yellow: 'bg-amber-400', blue: 'bg-sky-500', slate: 'bg-slate-500' }
const TONE_BADGE = {
  green: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  red: 'bg-red-100 text-red-800 ring-red-200',
  yellow: 'bg-amber-100 text-amber-800 ring-amber-200',
  blue: 'bg-sky-100 text-sky-800 ring-sky-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  violet: 'bg-violet-100 text-violet-800 ring-violet-200',
}

export function Panel({ title, icon: Icon, actions, children, className, bodyClassName }) {
  return (
    <section className={cx('rounded-2xl bg-white shadow-sm ring-1 ring-slate-200', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            {Icon && <Icon className="h-4 w-4 text-slate-500" />}
            {title}
          </h2>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx('p-4', bodyClassName)}>{children}</div>
    </section>
  )
}

const BTN = {
  primary: 'bg-slate-900 text-white hover:bg-slate-700',
  soft: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
}

export function Button({ variant = 'primary', size = 'md', icon: Icon, className, children, ...props }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
        BTN[variant],
        className,
      )}
      {...props}
    >
      {Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
      {children}
    </button>
  )
}

export function IconButton({ icon: Icon, label, tone = 'slate', className, ...props }) {
  const tones = { slate: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900', red: 'text-slate-400 hover:bg-red-50 hover:text-red-600', green: 'text-emerald-600 hover:bg-emerald-50' }
  return (
    <button type="button" title={label} aria-label={label} className={cx('rounded-lg p-1.5 transition', tones[tone], className)} {...props}>
      <Icon className="h-4 w-4" />
    </button>
  )
}

export function Badge({ tone = 'slate', children, className }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', TONE_BADGE[tone], className)}>{children}</span>
}

export function ProgressBar({ value = 0, tone, className }) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <div className={cx('h-full rounded-full transition-all', TONE_BAR[tone || toneFor(value)])} style={{ width: `${v}%` }} />
    </div>
  )
}

export function Stat({ label, value, sub, tone = 'slate', icon: Icon }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>{label}</span>
        {Icon && <Icon className={cx('h-4 w-4', TONE_TEXT[tone])} />}
      </div>
      <div className={cx('mt-1 text-xl font-bold tracking-tight sm:text-2xl', TONE_TEXT[tone])}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

export function Modal({ open, title, onClose, children, wide }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={cx('max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:rounded-3xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <IconButton icon={X} label="Fechar" onClick={onClose} />
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  )
}

const INPUT = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50'

export function Input({ className, ...props }) {
  return <input className={cx(INPUT, className)} {...props} />
}

export function Select({ className, options, children, ...props }) {
  return (
    <select className={cx(INPUT, 'pr-8', className)} {...props}>
      {options ? options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>) : children}
    </select>
  )
}

export function Toggle({ checked, onChange, label, tone = 'slate' }) {
  const on = { slate: 'bg-slate-900', red: 'bg-red-600', green: 'bg-emerald-600' }
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="inline-flex items-center gap-2 text-sm">
      <span className={cx('relative h-6 w-11 rounded-full transition', checked ? on[tone] : 'bg-slate-300')}>
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
      {label && <span>{label}</span>}
    </button>
  )
}

export function Segmented({ value, onChange, options, className }) {
  return (
    <div className={cx('inline-flex rounded-xl bg-slate-100 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx('flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm', value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ children }) {
  return <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{children}</div>
}

export function Gauge({ value = 0, warn = 3, danger = 5, max, label, sub }) {
  const scaleMax = max ?? Math.max(danger * 2, value * 1.1, 1)
  const ratio = Math.max(0, Math.min(1, value / scaleMax))
  const tone = value >= danger ? '#dc2626' : value >= warn ? '#f59e0b' : '#16a34a'
  const r = 80
  const arc = Math.PI * r
  const zone = (from, to, color) => {
    const a = Math.max(0, Math.min(1, from / scaleMax))
    const b = Math.max(0, Math.min(1, to / scaleMax))
    return <path d={`M 20 100 A ${r} ${r} 0 0 1 180 100`} fill="none" stroke={color} strokeWidth="6" strokeDasharray={`0 ${a * arc} ${(b - a) * arc} ${arc}`} />
  }
  const angle = Math.PI * (1 - ratio)
  const nx = 100 + Math.cos(angle) * (r - 18)
  const ny = 100 - Math.sin(angle) * (r - 18)
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 118" className="w-full max-w-[260px]">
        <path d={`M 20 100 A ${r} ${r} 0 0 1 180 100`} fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round" />
        <path d={`M 20 100 A ${r} ${r} 0 0 1 180 100`} fill="none" stroke={tone} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${ratio * arc} ${arc}`} />
        <g transform="translate(0,-14)" opacity="0.9">
          {zone(0, warn, '#86efac')}
          {zone(warn, danger, '#fcd34d')}
          {zone(danger, scaleMax, '#fca5a5')}
        </g>
        <line x1="100" y1="100" x2={nx} y2={ny} stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="100" r="6" fill="#0f172a" />
      </svg>
      <div className="-mt-1 text-center">
        <div className="text-2xl font-bold" style={{ color: tone }}>{label}</div>
        {sub && <div className="text-xs text-slate-500">{sub}</div>}
      </div>
    </div>
  )
}
