import { PAYMENT_METHODS } from '../store/defaults.js'

export function paymentLabel(state, method) {
  const card = state.cards.find((c) => c.id === method)
  if (card) return card.name
  return PAYMENT_METHODS.find((p) => p.id === method)?.label || '—'
}

export function paymentOptions(state, { excludeTypes = [] } = {}) {
  return [
    ...PAYMENT_METHODS.map((p) => ({ value: p.id, label: p.label })),
    ...state.cards.filter((c) => !excludeTypes.includes(c.type)).map((c) => ({ value: c.id, label: `Cartão: ${c.name}` })),
  ]
}
