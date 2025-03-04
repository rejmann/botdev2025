// Função para calcular o RSI (Relative Strength Index)
function RSI(prices, period = 14) {
  if (prices.length < period + 1) return 50; // Retorna valor neutro se não houver dados suficientes

  const gains = [];
  const losses = [];

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains.push(change);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(change));
    }
  }

  const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
  const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;

  // Evita divisão por zero
  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Função para calcular o ATR (Average True Range)
function ATR(highs, lows, closes, period = 14) {
  if (
    !highs || !lows || !closes ||
    highs.length < period + 1 ||
    lows.length < period + 1 ||
    closes.length < period + 1
  ) {
    return 0;
  }

  const trValues = [];
  for (let i = 1; i < highs.length; i++) {
    const high = highs[i];
    const low = lows[i];
    const prevClose = closes[i - 1];
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trValues.push(tr);
  }

  return trValues
    .slice(-period)
    .reduce((sum, tr) => sum + tr, 0) / period;
}

// Função para calcular as Bandas de Bollinger
function calculateBollingerBands(prices, period = 20, multiplier = 2) {
  if (prices.length < period) {
    return { upper: null, lower: null };
  }

  const sma = prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;
  const squaredDiffs = prices.slice(-period).map(price => Math.pow(price - sma, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: sma + (stdDev * multiplier),
    lower: sma - (stdDev * multiplier)
  };
}

// Função para calcular o MACD
function calculateMACD(prices, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) {
  if (prices.length < longPeriod) return { line: 0, signal: 0 };

  const emaShort = EMA(prices, shortPeriod);
  const emaLong = EMA(prices, longPeriod);
  const macdLine = emaShort - emaLong;

  // Calcula a média do MACD para criar a signal line
  const signalLine = EMA([...Array(signalPeriod).fill(macdLine)], signalPeriod);

  return { line: macdLine, signal: signalLine };
}

// Função auxiliar para calcular a EMA (Exponential Moving Average)
function EMA(prices, period) {
  if (prices.length < period) return prices[0];

  let ema = prices[0];
  const multiplier = 2 / (period + 1);

  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
* Processa os dados da resposta da ordem e retorna um objeto tradeData.
* @param {Object} data - Resposta da API da Binance.
* @param {number} price - Preço enviado na ordem.
* @param {number} quantity - Quantidade calculada da ordem.
* @param {string} side - Lado da operação (BUY ou SELL).
* @returns {Object} tradeData com os dados processados.
*/
function processTradeResponse(data, price, quantity, side) {
  if (!data || typeof data !== "object" || !data.symbol || !data.executedQty) {
    console.error("Erro ao processar resposta da ordem. Dados inválidos recebidos:", data);
    return null;
  }

  const fillPrice = (data.fills && data.fills.length > 0)
    ? parseFloat(data.fills[0].price)
    : price;

  return {
    timestamp: data.transactTime || Date.now(),
    symbol: data.symbol,
    side: data.side || side,
    price: fillPrice,
    quantity: parseFloat(data.executedQty) || quantity,
    fee: (data.fills && data.fills.length > 0) ? parseFloat(data.fills[0].commission) : 0,
    status: data.status
  };
}

module.exports = {
  RSI,
  ATR,
  calculateBollingerBands,
  calculateMACD,
  processTradeResponse
};
