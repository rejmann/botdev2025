// 🔥 Função para ajustar quantidade de ordens dentro dos limites da Binance
export function quantizeQuantity(quantity, stepSize, minQty) {
  quantity = Math.floor(quantity / stepSize) * stepSize
  return quantity >= minQty ? quantity : 0
}
