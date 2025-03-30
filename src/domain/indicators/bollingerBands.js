// Função para calcular as Bandas de Bollinger
export function calculateBollingerBands(prices, period = 20, multiplier = 2) {
  if (prices.length < period) {
    return {
      upper: null,
      lower: null 
    }
  }

  const sma = prices.slice(-period).reduce((sum, price) => sum + price, 0) / period
  const squaredDiffs = prices.slice(-period).map(price => Math.pow(price - sma, 2))
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period
  const stdDev = Math.sqrt(variance)

  return {
    upper: sma + (stdDev * multiplier),
    lower: sma - (stdDev * multiplier)
  }
}
