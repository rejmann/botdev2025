// Função para calcular o RSI
function RSI(prices, period = 14) {
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

    const rs = avgGain / avgLoss || 0;
    return 100 - (100 / (1 + rs));
}

// Função para calcular o ATR
function ATR(prices, period = 14) {
    const trValues = [];
    for (let i = 1; i < prices.length; i++) {
        const high = prices[i];
        const low = prices[i - 1];
        const prevClose = prices[i - 1];
        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        trValues.push(tr);
    }

    const atr = trValues.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
    return atr;
}

// Função para calcular as Bandas de Bollinger
function calculateBollingerBands(prices, period = 20, multiplier = 2) {
    const sma = prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;
    const squaredDiffs = prices.slice(-period).map(price => Math.pow(price - sma, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
    const stdDev = Math.sqrt(variance);

    const upperBand = sma + (stdDev * multiplier);
    const lowerBand = sma - (stdDev * multiplier);

    return { upper: upperBand, lower: lowerBand };
}

// Função para calcular o MACD
function calculateMACD(prices, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) {
    const emaShort = EMA(prices, shortPeriod);
    const emaLong = EMA(prices, longPeriod);
    const macdLine = emaShort - emaLong;
    const signalLine = EMA(prices.slice(-signalPeriod), signalPeriod);

    return { line: macdLine, signal: signalLine };
}

// Função auxiliar para calcular a EMA
function EMA(prices, period) {
    let ema = prices[0];
    const multiplier = 2 / (period + 1);

    for (let i = 1; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
}

module.exports = { RSI, ATR, calculateBollingerBands, calculateMACD };