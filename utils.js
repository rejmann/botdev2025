function averages(prices, period, startIndex) {
    let gains = 0, losses = 0;
    for (let i = 0; i < period && (i + startIndex) < prices.length; i++) {
        const diff = prices[i + startIndex] - prices[i + startIndex - 1];
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
    }
    return { avgGains: gains / period, avgLosses: losses / period };
}

function RSI(prices, period) {
    let avgGains = 0, avgLosses = 0;
    for (let i = 1; i < prices.length; i++) {
        let newAverages = averages(prices, period, i);
        if (i === 1) {
            avgGains = newAverages.avgGains;
            avgLosses = newAverages.avgLosses;
            continue;
        }
        avgGains = (avgGains * (period - 1) + newAverages.avgGains) / period;
        avgLosses = (avgLosses * (period - 1) + newAverages.avgLosses) / period;
    }
    const rs = avgGains / avgLosses;
    return 100 - (100 / (1 + rs));
}

function ATR(prices, period) {
    let sum = 0;
    for (let i = 1; i < period; i++) {
        sum += Math.abs(prices[i] - prices[i - 1]);
    }
    return sum / period;
}

module.exports = { RSI, ATR };
