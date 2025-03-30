import axios from 'axios'

const API_URL = process.env.BINANCE_TESTNET === "true" 
  ? "https://testnet.binance.vision" 
  : "https://api.binance.com"

const API_KEY = process.env.BINANCE_API_KEY

const SECRET_KEY = process.env.BINANCE_SECRET_KEY

async function httpRequest(url, options = {}) {
  try {
    return await axios({
      url: API_URL + '/' + url,
      method: options.method || 'GET',
      data: options.data,
      headers: options.headers,
      timeout: options.timeout || 5000,
    })
  } catch (error) {
    console.error(`HTTP Request failed to ${url}:`, error.message)

    console.error(
      'Erro ao buscar dados da Binance:',
      error.response
        ? JSON.stringify(error.response.data, null, 2)
        : error.message
    )

    throw error
  }
}

export async function getKlines(symbol) {
  const response = await httpRequest(
    `api/v3/klines?limit=100&interval=5m&symbol=${symbol}`,
    {
      headers: {
        "X-MBX-APIKEY": API_KEY 
      },
      timeout: 5000,
    }
  )

  if (!response || !response.data || !Array.isArray(response.data) || response.data.length === 0) {
    console.error("Erro: Resposta da Binance veio vazia ou inválida.")
    return []
  }

  return response.data
}

export async function postOrder(order) {
  // Ordena e assina os parâmetros
  const sortedParams = Object.keys(order).sort()
    .map(key => `${key}=${order[key]}`)
    .join('&')

  const signature = crypto.createHmac("sha256", SECRET_KEY)
    .update(sortedParams)
    .digest("hex")

  const finalQuery = `${sortedParams}&signature=${signature}`
  
  const response = await httpRequest(
    'api/v3/order',
    finalQuery, // TODO: ver qual parametro é no axios
    {
      headers: {
        "X-MBX-APIKEY": API_KEY,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  )

  return response.data
}

export async function getTicketPrice(symbol) {
  const response = await httpRequest(`api/v3/ticker/price?symbol=${symbol}`)

  return response.data
}
