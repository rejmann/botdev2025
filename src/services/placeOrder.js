import { newOrder } from '../../trade'
import { saveTrade } from '../../tradeModel'

import { quantizeQuantity } from './quantizeQuantity'

// placeOrder, sem check de global.buyPrice
export async function placeOrder(symbol, side, price) {
  try {
    const filters = await getSymbolFilters(symbol)
    if (!filters) return false

    const minQty = filters.LOT_SIZE.minQty
    const stepSize = filters.LOT_SIZE.stepSize

    let quantity = 0
    if (side === "BUY") {
      const balanceWallet = await getBalance(TICKET_WALLET)
      const maxQuantity = balanceWallet / price
      quantity = quantizeQuantity(maxQuantity, stepSize)
    } else if (side === "SELL") {
      const btcBalance = await getBalance(TICKET_BUY)
      quantity = quantizeQuantity(btcBalance, stepSize)
    }

    if (quantity < minQty) {
      console.error("Quantidade inválida para ordem")
      return false
    }

    console.log(`Tentando ${side} ${quantity} BTC a ${price} USDT`)
    const orderSuccess = await newOrder(symbol, side, price)

    if (orderSuccess) {
      saveTrade({
        timestamp: Date.now(),
        symbol,
        side,
        price,
        quantity,
        status: "FILLED",
      })
    }

    return orderSuccess
  } catch (error) {
    console.error("Erro ao colocar ordem:", error.message)
    return false
  }
}