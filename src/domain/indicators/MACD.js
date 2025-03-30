import { EMA } from './EMA.js'

// Função para calcular o MACD
export function calculateMACD(prices, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) {
  if (prices.length < longPeriod) {
    return {
      line: 0,
      signal: 0 
    }
  }

  const emaShort = EMA(prices, shortPeriod)
  const emaLong = EMA(prices, longPeriod)
  const macdLine = emaShort - emaLong

  // Calcula a média do MACD para criar a signal line
  const signalLine = EMA([...Array(signalPeriod).fill(macdLine)], signalPeriod)

  return {
    line: macdLine,
    signal: signalLine 
  }
}
