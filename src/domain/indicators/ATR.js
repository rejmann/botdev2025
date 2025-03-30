// Função para calcular o ATR (Average True Range)
export function ATR(highs, lows, closes, period = 14) {
  if (
    !highs || !lows || !closes ||
    highs.length < period + 1 ||
    lows.length < period + 1 ||
    closes.length < period + 1
  ) {
    return 0
  }

  const trValues = []
  for (let i = 1; i < highs.length; i++) {
    const high = highs[i]
    const low = lows[i]
    const prevClose = closes[i - 1]
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose))
    trValues.push(tr)
  }

  return trValues
    .slice(-period)
    .reduce((sum, tr) => sum + tr, 0) / period
}
