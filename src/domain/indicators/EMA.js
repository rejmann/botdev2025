// Função auxiliar para calcular a EMA (Exponential Moving Average)
export function EMA(prices, period) {
  if (prices.length < period) {
    return prices[0]
  }

  let ema = prices[0]
  const multiplier = 2 / (period + 1)

  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema
  }

  return ema
}
