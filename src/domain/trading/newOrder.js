import { getBalance, getSymbolFilters } from '../../../trade'
import { postOrder } from '../../infrastructure/http/httpRequest'
import { processTradeResponse } from '../../infrastructure/repositories/processTradeResponse'
import { quantizeQuantity } from '../../services/quantizeQuantity'

// 🔥 Função para criar ordens de compra/venda
async function newOrder(symbol, side, price) {
  try {
    const filters = await getSymbolFilters(symbol)
    if (!filters || !filters.LOT_SIZE) {
      console.error("Filtros do símbolo não encontrados!")
      return false
    }

    const { minQty, stepSize } = filters.LOT_SIZE

    let quantity = 0
    if (side === "BUY") {
      // O index.js gerencia e decide se vai comprar, e qual "buyPrice" será
      // Aqui apenas calcula a quantidade com base no saldo.
      const usdtBalance = await getBalance("USDT")
      quantity = quantizeQuantity(usdtBalance / price, stepSize, minQty)
    } else if (side === "SELL") {
      // O index.js decide se deve vender, esse trade.js só executa.
      const btcBalance = await getBalance("BTC")
      quantity = quantizeQuantity(btcBalance, stepSize, minQty)
    }

    if (quantity === 0) {
      console.error(`Quantidade inválida para ordem! Mínimo permitido: ${minQty}`)
      return false
    }

    // **Removemos** o uso de global.buyPrice aqui
    // porque o index.js já fez essa checagem e já decidiu pela venda.

    const timestamp = Date.now()
    const order = {
      symbol,
      side,
      type: "MARKET",
      quantity: quantity.toFixed(6),
      timestamp
    }

    const data = await postOrder(order)

    // processTradeResponse, se você usa
    const tradeData = processTradeResponse(data, price, quantity, side)

    console.log(`Ordem de ${side} executada com sucesso:`, data)
    // Se quiser salvar em trade.json ou via "saveTrade" do tradeModel, pode fazê-lo aqui
    // se o processTradeResponse for coerente

    return true
  } catch (err) {
    console.error("Erro na ordem:", err.response ? JSON.stringify(err.response.data) : err.message)
    return false
  }
}