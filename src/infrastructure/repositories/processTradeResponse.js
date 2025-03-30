/**
* Processa os dados da resposta da ordem e retorna um objeto tradeData.
* @param {Object} data - Resposta da API da Binance.
* @param {number} price - Preço enviado na ordem.
* @param {number} quantity - Quantidade calculada da ordem.
* @param {string} side - Lado da operação (BUY ou SELL).
* @returns {Object} tradeData com os dados processados.
*/
export function processTradeResponse(data, price, quantity, side) {
  if (!data || typeof data !== "object" || !data.symbol || !data.executedQty) {
    console.error("Erro ao processar resposta da ordem. Dados inválidos recebidos:", data)
    return null
  }

  const fillPrice = (data.fills && data.fills.length > 0)
    ? parseFloat(data.fills[0].price)
    : price

  return {
    timestamp: data.transactTime || Date.now(),
    symbol: data.symbol,
    side: data.side || side,
    price: fillPrice,
    quantity: parseFloat(data.executedQty) || quantity,
    fee: (data.fills && data.fills.length > 0) ? parseFloat(data.fills[0].commission) : 0,
    status: data.status
  }
}
