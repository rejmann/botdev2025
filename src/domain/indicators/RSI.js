// Função para calcular o RSI (Relative Strength Index)
export function RSI(prices, period = 14) {
  if (prices.length < period + 1) return 50 // Retorna valor neutro se não houver dados suficientes

  const gains = []
  const losses = []

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) {
      gains.push(change)
      losses.push(0)
    } else {
      gains.push(0)
      losses.push(Math.abs(change))
    }
  }

  const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period
  const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period

  // Evita divisão por zero
  if (avgLoss === 0) return 100

  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}
