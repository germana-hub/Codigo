import { money, pct } from './format.js'
import { cardSummary, categorySpend, computeBudget, fuelStats, microStats } from './finance.js'

const LEVEL_ORDER = { danger: 0, warn: 1, info: 2, ok: 3 }

export function generateInsights(state, month) {
  const s = state.settings
  const out = []
  const push = (level, title, text, icon) => out.push({ level, title, text, icon })

  const summaries = state.cards.map((c) => cardSummary(state, c, month))
  for (const cs of summaries) {
    const { card } = cs
    if (cs.limit > 0 && cs.usagePct >= s.cardDangerPct) push('danger', `Uso alto: ${card.name}`, `${pct(cs.usagePct, 0)} do limite comprometido (${money(cs.debt)} de ${money(cs.limit)}).`, 'card')
    else if (cs.limit > 0 && cs.usagePct >= s.cardWarnPct) push('warn', `Atenção ao limite: ${card.name}`, `${pct(cs.usagePct, 0)} do limite já comprometido.`, 'card')
    if (card.type === 'weekly' && cs.weekCap > 0) {
      if (cs.weekPct >= 100) push('danger', `Teto semanal atingido: ${card.name}`, `Gasto da semana ${money(cs.weekSpend)} / teto ${money(cs.weekCap)}. Novas compras serão bloqueadas.`, 'week')
      else if (cs.weekPct >= 80) push('warn', `Teto semanal próximo: ${card.name}`, `Restam apenas ${money(cs.weekCap - cs.weekSpend)} nesta semana.`, 'week')
    }
    if (card.type === 'emergency' && s.emergencyMode) push('warn', 'Modo emergência ativo', `A fatura de "${card.name}" (${money(cs.bill)}) está entrando no orçamento do mês.`, 'siren')
  }

  for (const c of categorySpend(state, month)) {
    if (!(c.limit > 0)) continue
    const p = (c.spent / c.limit) * 100
    if (p >= 100) push('danger', `Categoria estourada: ${c.name}`, `${money(c.spent)} gastos de ${money(c.limit)} (${pct(p, 0)}).`, 'category')
    else if (p >= s.categoryWarnPct) push('warn', `Categoria perto do limite: ${c.name}`, `${pct(p, 0)} usado — restam ${money(c.limit - c.spent)}.`, 'category')
  }

  const micro = microStats(state, month)
  if (micro.pctOfIncome >= s.microDangerPct) push('danger', 'Vazamento de gotinhas!', `Gastos formiguinha já consomem ${pct(micro.pctOfIncome)} da renda líquida (${money(micro.total)}).`, 'drop')
  else if (micro.projectedPct >= s.microAlertPct) push('warn', 'Gotinhas acumulando', `No ritmo atual, os micro-gastos chegarão a ${money(micro.projected)} (${pct(micro.projectedPct)} da renda). Em 12 meses: ${money(micro.yearly)}.`, 'drop')
  if (micro.byTag[0] && micro.total > 0) push('info', `Maior gotinha: ${micro.byTag[0].tag}`, `${money(micro.byTag[0].value)} no mês — ${pct((micro.byTag[0].value / micro.total) * 100, 0)} dos micro-gastos.`, 'drop')

  const fuel = fuelStats(state, month)
  if (fuel.actual > fuel.projected.max) push('danger', 'Combustível médico acima do previsto', `${money(fuel.actual)} gastos vs. teto projetado de ${money(fuel.projected.max)}.`, 'fuel')
  else if (fuel.actual > fuel.projected.avg) push('warn', 'Combustível médico acima da média', `${money(fuel.actual)} vs. média projetada ${money(fuel.projected.avg)}.`, 'fuel')

  for (const [period, label] of [['q1', '1ª Quinzena'], ['q2', '2ª Quinzena']]) {
    const b = computeBudget(state, month, period)
    if (b.forecast < 0) push('danger', `${label} no vermelho`, `Previsão de saldo ${money(b.forecast)}. Reveja gastos variáveis ou remaneje despesas para a outra quinzena.`, 'balance')
    else if (b.income > 0 && b.forecast < b.income * 0.1) push('warn', `${label} apertada`, `Sobra prevista de apenas ${money(b.forecast)} (${pct((b.forecast / b.income) * 100, 0)} da renda da quinzena).`, 'balance')
  }

  const month_ = computeBudget(state, month, 'month')
  const debtCards = summaries.filter((cs) => cs.counted && cs.debt > 0).sort((a, b) => b.debt - a.debt)
  if (debtCards.length) {
    const top = debtCards[0]
    push('info', 'Sugestão: foco de quitação', `"${top.card.name}" concentra a maior dívida (${money(top.debt)}${top.payoffMonths ? `, ~${top.payoffMonths} meses até quitar` : ''}). Priorize antecipar parcelas dele (método avalanche/bola de neve).`, 'tip')
  }
  if (month_.forecast > 0 && debtCards.length) {
    const extra = Math.round(month_.forecast * 0.3)
    if (extra >= 50) push('ok', 'Sobra disponível para amortizar', `Separe ~30% da sobra prevista (${money(extra)}) para antecipar parcelas e reduzir juros.`, 'tip')
  }
  const reno = summaries.find((cs) => cs.card.type === 'installments')
  if (reno && reno.bill > 0) push('info', 'Parcelas fixas carro/reforma', `${money(reno.bill)} este mês. Evite novas parcelas até ${reno.lastMonth ?? '—'} para liberar ${money(reno.bill)}/mês.`, 'tip')
  if (micro.total > 0) push('info', 'Corte as gotinhas', `Reduzir os micro-gastos pela metade libera ~${money(micro.projected / 2)}/mês para amortizar dívidas.`, 'tip')

  if (!out.some((i) => i.level === 'danger' || i.level === 'warn')) push('ok', 'Tudo sob controle', 'Nenhum alerta crítico neste mês. Continue registrando os gastos!', 'ok')
  return out.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])
}
