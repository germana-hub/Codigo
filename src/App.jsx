import { useEffect, useRef, useState } from 'react'
import { CalendarRange, ChevronLeft, ChevronRight, CreditCard, Droplets, LayoutDashboard, Plus, ReceiptText, Settings, Siren } from 'lucide-react'
import { useStore } from './store/AppStore.jsx'
import { addMonths, currentMonth, monthLabel } from './lib/format.js'
import { KIND_LABELS } from './lib/entries.js'
import { EditorProvider, useEditor } from './components/Editor.jsx'
import SettingsModal from './components/Settings.jsx'
import { cx } from './lib/style.js'
import Dashboard from './pages/Dashboard.jsx'
import Quinzenas from './pages/Quinzenas.jsx'
import Cards from './pages/Cards.jsx'
import Micro from './pages/Micro.jsx'
import Extrato from './pages/Extrato.jsx'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'quinzenas', label: 'Quinzenas', icon: CalendarRange },
  { id: 'cards', label: 'Cartões', icon: CreditCard },
  { id: 'micro', label: 'Gotinhas', icon: Droplets },
  { id: 'extrato', label: 'Extrato', icon: ReceiptText },
]
const tabFromHash = () => {
  const h = window.location.hash.replace('#', '')
  return TABS.some((t) => t.id === h) ? h : 'dashboard'
}

function QuickAdd() {
  const { openEditor } = useEditor()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400">
        <Plus className="h-4 w-4" /><span className="hidden sm:inline">Lançar</span>
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl bg-white py-1 text-sm text-slate-800 shadow-xl ring-1 ring-slate-200">
          {['micro', 'fuel', 'charge', 'fixed', 'income'].map((k) => (
            <button key={k} type="button" className="block w-full px-4 py-2 text-left hover:bg-slate-50" onClick={() => { setOpen(false); openEditor(k) }}>{KIND_LABELS[k]}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function Shell() {
  const { state, month, setMonth, setSettings, saveError } = useStore()
  const [tab, setTab] = useState(tabFromHash)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const goTo = (id) => {
    window.location.hash = id
    setTab(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const emergency = !!state.settings.emergencyMode

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500/20"><Droplets className="h-5 w-5 text-sky-400" /></div>
            <div className="leading-tight">
              <div className="text-sm font-bold">Finanças Quinzenais</div>
              <div className="text-[11px] text-slate-400">Controle de quinzenas & gotinhas</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Mês anterior" onClick={() => setMonth(addMonths(month, -1))} className="rounded-lg p-1.5 hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => setMonth(currentMonth())} className="min-w-[110px] rounded-lg px-1 py-1 sm:min-w-[128px] sm:px-2 text-center text-sm font-medium hover:bg-white/10" title="Voltar para o mês atual">{monthLabel(month)}</button>
            <button type="button" aria-label="Próximo mês" onClick={() => setMonth(addMonths(month, 1))} className="rounded-lg p-1.5 hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSettings({ emergencyMode: !emergency })}
              title="Modo emergência: inclui o cartão de emergência no orçamento"
              className={cx('inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-semibold transition', emergency ? 'bg-red-600 text-white animate-pulse' : 'bg-white/10 text-slate-200 hover:bg-white/20')}
            >
              <Siren className="h-4 w-4" /><span className="hidden sm:inline">{emergency ? 'Emergência ON' : 'Emergência'}</span>
            </button>
            <QuickAdd />
            <button type="button" aria-label="Configurações" onClick={() => setSettingsOpen(true)} className="rounded-xl bg-white/10 p-2 hover:bg-white/20"><Settings className="h-4 w-4" /></button>
          </div>
        </div>
        <nav className="mx-auto hidden max-w-7xl gap-1 px-4 md:flex">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => goTo(id)} className={cx('flex items-center gap-1.5 rounded-t-xl px-4 py-2 text-sm font-medium transition', tab === id ? 'bg-slate-100 text-slate-900' : 'text-slate-300 hover:bg-white/10')}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </nav>
      </header>

      {saveError && <div className="bg-red-600 px-4 py-2 text-center text-xs text-white">Não foi possível salvar no navegador: {saveError}</div>}

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4">
        {tab === 'dashboard' && <Dashboard goTo={goTo} />}
        {tab === 'quinzenas' && <Quinzenas />}
        {tab === 'cards' && <Cards />}
        {tab === 'micro' && <Micro />}
        {tab === 'extrato' && <Extrato />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => goTo(id)} className={cx('flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium', tab === id ? 'text-sky-600' : 'text-slate-500')}>
            <Icon className="h-5 w-5" />{label}
          </button>
        ))}
      </nav>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

export default function App() {
  return (
    <EditorProvider>
      <Shell />
    </EditorProvider>
  )
}
