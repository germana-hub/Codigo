import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { currentMonth, uid } from '../lib/format.js'
import { blankState, demoState, SCHEMA_VERSION, STORAGE_KEY } from './defaults.js'

const COLLECTIONS = ['incomes', 'cards', 'fixedExpenses', 'charges', 'microExpenses', 'fuelLogs', 'categories']

function normalize(raw) {
  const base = blankState()
  if (!raw || typeof raw !== 'object') return null
  const out = { ...base, ...raw, version: SCHEMA_VERSION }
  out.settings = { ...base.settings, ...(raw.settings || {}) }
  for (const c of COLLECTIONS) out[c] = Array.isArray(raw[c]) ? raw[c] : base[c]
  out.microTags = Array.isArray(raw.microTags) && raw.microTags.length ? raw.microTags : base.microTags
  return out
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return normalize(JSON.parse(raw)) ?? demoState()
  } catch (err) {
    console.warn('Falha ao ler localStorage', err)
  }
  return demoState()
}

function reducer(state, action) {
  switch (action.type) {
    case 'add':
      return { ...state, [action.collection]: [...state[action.collection], { id: uid(), ...action.item }] }
    case 'update':
      return {
        ...state,
        [action.collection]: state[action.collection].map((x) => (x.id === action.id ? { ...x, ...action.patch, id: x.id } : x)),
      }
    case 'remove':
      return { ...state, [action.collection]: state[action.collection].filter((x) => x.id !== action.id) }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'microTags':
      return { ...state, microTags: action.tags }
    case 'replace':
      return normalize(action.state) ?? state
    default:
      return state
  }
}

const StoreContext = createContext(null)

export function AppStoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  const [month, setMonth] = useState(currentMonth)
  const [period, setPeriod] = useState('month')
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      setSaveError(null)
    } catch (err) {
      setSaveError(err?.message || 'Erro ao salvar')
    }
  }, [state])

  const add = useCallback((collection, item) => dispatch({ type: 'add', collection, item }), [])
  const update = useCallback((collection, id, patch) => dispatch({ type: 'update', collection, id, patch }), [])
  const remove = useCallback((collection, id) => dispatch({ type: 'remove', collection, id }), [])
  const setSettings = useCallback((patch) => dispatch({ type: 'settings', patch }), [])
  const setMicroTags = useCallback((tags) => dispatch({ type: 'microTags', tags }), [])
  const replace = useCallback((next) => dispatch({ type: 'replace', state: next }), [])
  const resetDemo = useCallback(() => dispatch({ type: 'replace', state: demoState() }), [])
  const resetBlank = useCallback(() => dispatch({ type: 'replace', state: blankState() }), [])

  const value = useMemo(
    () => ({ state, month, setMonth, period, setPeriod, add, update, remove, setSettings, setMicroTags, replace, resetDemo, resetBlank, saveError }),
    [state, month, period, add, update, remove, setSettings, setMicroTags, replace, resetDemo, resetBlank, saveError],
  )
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore deve ser usado dentro de AppStoreProvider')
  return ctx
}
