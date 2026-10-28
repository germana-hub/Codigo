export const cx = (...c) => c.filter(Boolean).join(' ')
export const toneFor = (pctValue, warn = 60, danger = 80) => (pctValue >= danger ? 'red' : pctValue >= warn ? 'yellow' : 'green')
