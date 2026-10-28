# Finanças Quinzenais

SPA (React + Vite + Tailwind CSS v4 + Recharts + Lucide) para controle de orçamento quinzenal, 5 cartões de crédito, gastos formiguinha ("Gotinha d'Água") e logística de combustível para consultas médicas. Todos os dados ficam no `localStorage` do navegador (chave `financas-quinzenais:v1`).

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/ estático
```

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `src/store/defaults.js` | Rendas padrão (R$ 6.500 dia 5, R$ 5.829 dia 20, R$ 450 dia 26), 5 cartões, categorias, dados de exemplo |
| `src/store/AppStore.jsx` | Estado global (useReducer) + persistência em localStorage |
| `src/lib/finance.js` | Regras: quinzenas, faturas/parcelas, dívida, teto semanal, bloqueios, projeções |
| `src/lib/insights.js` | Motor de alertas e sugestões |
| `src/lib/entries.js` | Normalização/validação/salvamento de lançamentos |
| `src/components/` | UI base, modal de edição, configurações, error boundary |
| `src/pages/` | Dashboard, Quinzenas, Cartões, Gotinhas, Extrato |

## Regras principais

- **Quinzenas:** 1ª = dias 5–19 (salário do dia 5); 2ª = dias 20–fim e 1–4 (salário do dia 20 + bônus do dia 26/27). Despesas fixas e faturas têm quinzena de pagamento configurável.
- **Faturas:** compra entra na fatura conforme dia de fechamento/vencimento do cartão; parcelas são distribuídas mês a mês. Dívida acumulada = parcelas restantes + fatura atual.
- **Cartão 2 (Carro & Reforma):** aceita apenas categorias *Manutenção Carro* e *Reforma Casa*; gastos formiguinha/combustível não podem usá-lo.
- **Cartões semanais:** teto rígido por semana (seg–dom) — lançamentos que estouram são bloqueados.
- **Cartão de emergência:** fora do orçamento, exceto com o "Modo emergência" ligado.
- **Gotinha d'Água:** medidor de % da renda líquida mensal consumida por micro-gastos (alerta 3%, crítico 5%, configurável).
- **Combustível médico:** projeção = viagens/semana × média (R$ 30–50) por semana do mês vs. real.
