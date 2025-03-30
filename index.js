import { ATR } from "./src/domain/indicators/ATR.js"
import { calculateBollingerBands } from "./src/domain/indicators/bollingerBands.js"
import { calculateMACD } from "./src/domain/indicators/MACD.js"
import { RSI } from "./src/domain/indicators/RSI.js"
import { getKlines } from './src/infrastructure/http/httpRequest.js'
import { initializeBot, SYMBOL } from './src/services/initializeBot.js'
import { loadState } from './src/services/loadState.js'
import { placeOrder } from './src/services/placeOrder.js'
import { saveState } from './src/services/saveState.js'

const PERIOD = 14

// Taxa de 0.1% por operação => 0.2% total (ida+volta)
const FEE_RATE = 0.001
const TOTAL_FEE = FEE_RATE * 2

// Você não quer vender com prejuízo, então definimos lucros >= 0
// (Se quiser pelo menos 1% de lucro, ponha 0.01)
const MIN_PROFIT_MARGIN = 0.01

// Take Profit se o preço subir 15% acima do buyPrice + taxas
const TAKE_PROFIT_PERCENT = 0.15

let state = loadState()
let isOpened = state.isOpened
let buyPrice = state.buyPrice

// Lógica principal
async function start() {
  try {
    const data = await getKlines(SYMBOL)
    if (data.length < 20) {
      console.error(`Erro: Dados insuficientes (${data.length} candles).`)
      return
    }

    const lastCandle = data[data.length - 1]
    if (!lastCandle || !Array.isArray(lastCandle) || lastCandle.length < 5) {
      console.error("Erro: Último candle mal formatado.")
      return
    }

    // Preço de fechamento do último candle
    const lastPrice = parseFloat(lastCandle[4])

    // Arrays: fechamento, máxima, mínima
    const closes = data.map(k => parseFloat(k[4])).filter(v => !isNaN(v))
    const highs = data.map(k => parseFloat(k[2])).filter(v => !isNaN(v))
    const lows = data.map(k => parseFloat(k[3])).filter(v => !isNaN(v))

    // Checa se há candles suficientes
    const minCount = Math.min(closes.length, highs.length, lows.length)
    if (minCount < 20) {
      console.error("Erro: Arrays de candles incompletos (<20).")
      return
    }

    // Calcula indicadores
    const rsi = RSI(closes, PERIOD)
    const atr = ATR(highs, lows, closes, PERIOD)
    const bollinger = calculateBollingerBands(closes)
    const macd = calculateMACD(closes)

    // Valida indicadores
    if (
      isNaN(rsi) ||
      isNaN(atr) ||
      bollinger.upper === null || bollinger.lower === null ||
      isNaN(bollinger.upper) || isNaN(bollinger.lower) ||
      isNaN(macd.line) || isNaN(macd.signal)
    ) {
      console.error("Erro: Indicadores retornaram valores inválidos.")
      return
    }

    console.table([
      {
        Indicador: "RSI",
        Valor: rsi.toFixed(2) 
      },
      {
        Indicador: "ATR",
        Valor: atr.toFixed(2) 
      },
      {
        Indicador: "Bollinger Upper",
        Valor: bollinger.upper.toFixed(2) 
      },
      {
        Indicador: "Bollinger Lower",
        Valor: bollinger.lower.toFixed(2) 
      },
      {
        Indicador: "MACD Line",
        Valor: macd.line.toFixed(2) 
      },
      {
        Indicador: "MACD Signal",
        Valor: macd.signal.toFixed(2) 
      },
      {
        Indicador: "Posição Aberta?",
        Valor: isOpened 
      },
      {
        Indicador: "Preço Atual",
        Valor: lastPrice 
      },
    ])

    // Lógica de compra: RSI < 30
    if (rsi < 30 && !isOpened) {
      console.log("RSI abaixo de 30 => compra")
      const orderSuccess = await placeOrder(SYMBOL, "BUY", lastPrice)
      if (orderSuccess) {
        isOpened = true
        buyPrice = lastPrice
        saveState({
          isOpened,
          buyPrice 
        })
        console.log("Compra realizada com sucesso!")
      } else {
        console.log("Compra falhou. Tentará novamente na próxima verificação.")
      }
    } else if (isOpened) { // Lógica de venda: jamais vender com prejuízo
      const profit = ((lastPrice - buyPrice) / buyPrice) - TOTAL_FEE
      console.log(`Lucro estimado: ${(profit * 100).toFixed(2)}%`)

      // Se o lucro for menor que zero, não vende (não aceita prejuízo)
      if (profit < MIN_PROFIT_MARGIN) {
        console.log("Lucro negativo ou abaixo do mínimo. Mantendo posição para não ter prejuízo.")
        return
      }

      // Checa se RSI está > 70 (sobrecomprado) ou se chegou no TAKE_PROFIT
      const rsiHigh = (rsi > 70)
      const priceHighEnough = (lastPrice >= buyPrice * (1 + TAKE_PROFIT_PERCENT))

      if (rsiHigh || priceHighEnough) {
        console.log("Condições de venda atendidas (RSI alto ou take profit).")
        const sellSuccess = await placeOrder(SYMBOL, "SELL", lastPrice)
        if (sellSuccess) {
          isOpened = false
          buyPrice = 0
          saveState({
            isOpened,
            buyPrice 
          })
          console.log("Venda realizada com sucesso!")
        } else {
          console.log("Venda falhou. Tentará novamente na próxima verificação.")
        }
      }
    }
  } catch (error) {
    console.error("Erro ao buscar dados da Binance:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message)
  }
}

// Inicia o bot
initializeBot().then(() => {
  setInterval(start, 3000)
  start()
})
