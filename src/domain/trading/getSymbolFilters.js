import { getExchangeInfo } from '../../infrastructure/http/httpRequest.js'

// 🔥 Função para obter filtros do símbolo
export async function getSymbolFilters(symbol) {
  try {
    const data = await getExchangeInfo()
    const symbolInfo = data.symbols.find(s => s.symbol === symbol)

    if (!symbolInfo) {
      console.error(`Símbolo ${symbol} não encontrado!`)
      return null
    }

    const filters = {}
    symbolInfo.filters.forEach(filter => {
      if (filter.filterType === "LOT_SIZE") {
        filters.LOT_SIZE = {
          minQty: parseFloat(filter.minQty),
          maxQty: parseFloat(filter.maxQty),
          stepSize: parseFloat(filter.stepSize)
        }
      }
    })
    return filters
  } catch (error) {
    console.error("Erro ao obter filtros do símbolo:", error.message)
    return null
  }
}
