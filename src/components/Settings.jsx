import { useRef, useState } from 'react'
import { Download, Pencil, Plus, RotateCcw, Trash2, Upload, X } from 'lucide-react'
import { useStore } from '../store/AppStore.jsx'
import { money, toNumber } from '../lib/format.js'
import { Button, Field, IconButton, Input, Modal, Toggle } from './ui.jsx'
import { useEditor } from './Editor.jsx'

const NUM_SETTINGS = [
  ['microAlertPct', 'Gotinhas: alerta (% renda)'],
  ['microDangerPct', 'Gotinhas: crítico (% renda)'],
  ['cardWarnPct', 'Cartão: alerta (% limite)'],
  ['cardDangerPct', 'Cartão: crítico (% limite)'],
  ['categoryWarnPct', 'Categoria: alerta (% limite)'],
  ['fuelTripsPerWeek', 'Consultas por semana'],
  ['fuelCostMin', 'Custo mín. por viagem (R$)'],
  ['fuelCostMax', 'Custo máx. por viagem (R$)'],
]

export default function SettingsModal({ open, onClose }) {
  const store = useStore()
  const { state, setSettings, setMicroTags, replace, resetDemo, resetBlank } = store
  const { openEditor, confirmDelete } = useEditor()
  const [newTag, setNewTag] = useState('')
  const [msg, setMsg] = useState(null)
  const fileRef = useRef(null)

  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `financas-quinzenais-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  const importJson = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!data || typeof data !== 'object' || !Array.isArray(data.cards)) throw new Error('Arquivo inválido')
      replace(data)
      setMsg('Backup importado com sucesso.')
    } catch (err) {
      setMsg(`Falha ao importar: ${err.message}`)
    }
  }
  const addTag = () => {
    const t = newTag.trim()
    if (t && !state.microTags.includes(t)) setMicroTags([...state.microTags, t])
    setNewTag('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Configurações" wide>
      <div className="space-y-6">
        <section>
          <h4 className="mb-2 text-sm font-semibold">Modo emergência</h4>
          <Toggle tone="red" checked={!!state.settings.emergencyMode} onChange={(v) => setSettings({ emergencyMode: v })} label="Incluir cartão de emergência no orçamento" />
        </section>

        <section>
          <h4 className="mb-2 text-sm font-semibold">Parâmetros e alertas</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {NUM_SETTINGS.map(([key, label]) => (
              <Field key={key} label={label}>
                <Input type="number" step="0.5" min="0" value={state.settings[key]} onChange={(e) => setSettings({ [key]: toNumber(e.target.value) })} />
              </Field>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Categorias & limites mensais</h4>
            <Button size="sm" variant="soft" icon={Plus} onClick={() => openEditor('category')}>Categoria</Button>
          </div>
          <ul className="grid gap-1 sm:grid-cols-2">
            {state.categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5 text-sm">
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: c.color }} />{c.name}</span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  {c.limit > 0 ? money(c.limit) : 'sem limite'}
                  <IconButton icon={Pencil} label="Editar" onClick={() => openEditor('category', c)} />
                  <IconButton icon={Trash2} tone="red" label="Excluir" onClick={() => confirmDelete('category', c)} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="mb-2 text-sm font-semibold">Tipos de gotinha</h4>
          <div className="flex flex-wrap gap-1.5">
            {state.microTags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-amber-100 py-1 pl-3 pr-1 text-xs text-amber-900">
                {t}
                <button type="button" aria-label={`Remover ${t}`} className="rounded-full p-0.5 hover:bg-amber-200" onClick={() => state.microTags.length > 1 && setMicroTags(state.microTags.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input placeholder="Novo tipo" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()} />
            <Button variant="soft" icon={Plus} onClick={addTag}>Adicionar</Button>
          </div>
        </section>

        <section>
          <h4 className="mb-2 text-sm font-semibold">Dados (salvos no localStorage do navegador)</h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" icon={Download} onClick={exportJson}>Exportar backup</Button>
            <Button variant="soft" icon={Upload} onClick={() => fileRef.current?.click()}>Importar backup</Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={importJson} />
            <Button variant="soft" icon={RotateCcw} onClick={() => window.confirm('Substituir tudo pelos dados de exemplo?') && resetDemo()}>Dados de exemplo</Button>
            <Button variant="danger" icon={Trash2} onClick={() => window.confirm('Apagar todos os lançamentos? (Rendas, cartões e categorias padrão são mantidos)') && resetBlank()}>Limpar lançamentos</Button>
          </div>
          {msg && <p className="mt-2 text-xs text-slate-600">{msg}</p>}
        </section>
      </div>
    </Modal>
  )
}
