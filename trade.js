const axios = require("axios");
const crypto = require("crypto");
const { API_URL, API_KEY, SECRET_KEY } = require("./config");
const { saveTrade } = require('./tradeModel');
const { processTradeResponse } = require('./utils');

const MIN_PROFIT_MARGIN = 0.01; // 1% de lucro mínimo

// 🔥 Função para ajustar quantidade de ordens dentro dos limites da Binance
function quantizeQuantity(quantity, stepSize, minQty) {
    quantity = Math.floor(quantity / stepSize) * stepSize;
    return quantity >= minQty ? quantity : 0;
}

// 🔥 Função para obter saldo disponível
async function getBalance(asset) {
    try {
        const timestamp = Date.now();
        const query = `timestamp=${timestamp}`;
        const signature = crypto.createHmac("sha256", SECRET_KEY)
            .update(query)
            .digest("hex");

        const { data: accountInfo } = await axios.get(
            `${API_URL}/api/v3/account?${query}&signature=${signature}`,
            { headers: { "X-MBX-APIKEY": API_KEY } }
        );

        if (!accountInfo.balances) throw new Error("Saldo não disponível");
        const balance = accountInfo.balances.find(b => b.asset === asset);
        return balance ? parseFloat(balance.free) : 0;
    } catch (err) {
        console.error("🚨 Erro ao obter saldo:", err.response ? JSON.stringify(err.response.data) : err.message);
        return 0;
    }
}

// 🔥 Função para obter filtros do símbolo
async function getSymbolFilters(symbol) {
    try {
        const { data } = await axios.get(`${API_URL}/api/v3/exchangeInfo`);
        const symbolInfo = data.symbols.find(s => s.symbol === symbol);

        if (!symbolInfo) {
            console.error(`🚨 Símbolo ${symbol} não encontrado!`);
            return null;
        }

        const filters = {};
        symbolInfo.filters.forEach(filter => {
            if (filter.filterType === "LOT_SIZE") {
                filters.LOT_SIZE = {
                    minQty: parseFloat(filter.minQty),
                    maxQty: parseFloat(filter.maxQty),
                    stepSize: parseFloat(filter.stepSize)
                };
            }
        });
        return filters;
    } catch (error) {
        console.error("🚨 Erro ao obter filtros do símbolo:", error.message);
        return null;
    }
}

// 🔥 Função para criar ordens de compra/venda
async function newOrder(symbol, side, price) {
    try {
        const filters = await getSymbolFilters(symbol);
        if (!filters || !filters.LOT_SIZE) {
            console.error("🚨 Filtros do símbolo não encontrados!");
            return false;
        }
        const { minQty, stepSize } = filters.LOT_SIZE;

        let quantity = 0;
        if (side === "BUY") {
            const usdtBalance = await getBalance("USDT");
            quantity = quantizeQuantity(usdtBalance / price, stepSize, minQty);
        } else if (side === "SELL") {
            const btcBalance = await getBalance("BTC");
            quantity = quantizeQuantity(btcBalance, stepSize, minQty);
        }

        if (quantity === 0) {
            console.error(`🚨 Quantidade inválida para ordem! Mínimo permitido: ${minQty}`);
            return false;
        }

        if (side === "SELL") {
            if (!global.buyPrice || global.buyPrice <= 0) {
                console.error("🚨 Preço de compra não registrado. Abortando venda.");
                return false;
            }
            const profitPercent = (price - global.buyPrice) / global.buyPrice;
            if (profitPercent < MIN_PROFIT_MARGIN) {
                console.log(`📉 Margem de lucro insuficiente (${(profitPercent * 100).toFixed(2)}%). Operação abortada.`);
                return false;
            }
        }

        const timestamp = Date.now();
        const order = {
            symbol,
            side,
            type: "MARKET",
            quantity: quantity.toFixed(6),
            timestamp
        };

        const sortedParams = Object.keys(order)
            .sort()
            .map(key => `${key}=${order[key]}`)
            .join('&');
        console.log("📌 Parâmetros ordenados:", sortedParams);

        const signature = crypto.createHmac("sha256", SECRET_KEY)
            .update(sortedParams)
            .digest("hex");
        console.log("🔑 Assinatura gerada:", signature);

        const finalQuery = `${sortedParams}&signature=${signature}`;
        console.log("📤 Dados enviados:", finalQuery);

        const { data } = await axios.post(
            `${API_URL}/api/v3/order`,
            finalQuery,
            {
                headers: {
                    "X-MBX-APIKEY": API_KEY,
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }
        );

        const tradeData = processTradeResponse(data, price, quantity, side);

        if (side === "BUY") {
            global.buyPrice = price;
            console.log(`💰 Novo preço de compra registrado: ${global.buyPrice} USDT`);
        }

        fs.writeFileSync("trades.json", JSON.stringify(tradeData, null, 2));

        console.log(`✅ Ordem de ${side} executada com sucesso:`, data);
        return true;
    } catch (err) {
        console.error("🚨 Erro na ordem:", err.response ? err.response.data : err.message);
        return false;
    }
}

module.exports = { getBalance, newOrder, getSymbolFilters };
