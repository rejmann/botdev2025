const axios = require("axios");
const crypto = require("crypto");
const { API_URL, API_KEY, SECRET_KEY } = require("./config");
const { saveTrade } = require('./tradeModel');
const { processTradeResponse } = require('./utils');

// Definir margem mínima de lucro (1%)
const MIN_PROFIT_MARGIN = 0.01; // 1% de lucro

// Função para ajustar a quantidade para os filtros da Binance
function quantizeQuantity(quantity, stepSize, minQty) {
    quantity = Math.floor(quantity / stepSize) * stepSize;
    return quantity >= minQty ? quantity : 0; // Retorna 0 se for menor que o mínimo permitido
}

// Função para obter saldo disponível
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

        const balance = accountInfo.balances.find(b => b.asset === asset);
        return balance ? parseFloat(balance.free) : 0;
    } catch (err) {
        console.error("🚨 Erro ao obter saldo:", err.response ? JSON.stringify(err.response.data) : err.message);
        return 0;
    }
}

// Função para obter filtros do símbolo
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

// Função para criar ordens de compra/venda com verificação de margem
async function newOrder(symbol, side, price) {
    try {
        const filters = await getSymbolFilters(symbol);
        if (!filters || !filters.LOT_SIZE) {
            console.error("🚨 Filtros do símbolo não encontrados!");
            return false;
        }
        const { minQty, stepSize } = filters.LOT_SIZE;

        // Calcula a quantidade com base no saldo disponível
        let quantity = 0;
        if (side === "BUY") {
            const usdtBalance = await getBalance("USDT");
            quantity = quantizeQuantity(usdtBalance / price, stepSize, minQty);
        } else if (side === "SELL") {
            const btcBalance = await getBalance("BTC");
            quantity = quantizeQuantity(btcBalance, stepSize, minQty);
        }

        // Verifica se a quantidade é válida
        if (quantity === 0) {
            console.error(`🚨 Quantidade inválida para ordem! Mínimo permitido: ${minQty}`);
            return false;
        }

        // Se for ordem de venda, verifica se a margem de lucro é suficiente
        if (side === "SELL") {
            if (typeof global.buyPrice === 'undefined' || global.buyPrice <= 0) {
                console.error("🚨 Preço de compra não registrado. Abortando venda.");
                return false;
            }
            const profitPercent = (price - global.buyPrice) / global.buyPrice;
            if (profitPercent < MIN_PROFIT_MARGIN) {
                console.log(`📉 Margem de lucro insuficiente (${(profitPercent * 100).toFixed(2)}%). Operação abortada.`);
                return false;
            }
        }

        // Cria os parâmetros da ordem
        const timestamp = Date.now();
        const order = {
            symbol,
            side,
            type: "MARKET",
            quantity: quantity.toFixed(6), // Ajustando a quantidade corretamente
            timestamp
        };

        // Gera a string de consulta ordenada
        const sortedParams = Object.keys(order)
            .sort()
            .map(key => `${key}=${order[key]}`)
            .join('&');
        console.log("📌 Parâmetros ordenados:", sortedParams);

        // Gera a assinatura usando a string ordenada
        const signature = crypto.createHmac("sha256", SECRET_KEY)
            .update(sortedParams)
            .digest("hex");
        console.log("🔑 Assinatura gerada:", signature);

        // Concatena a string final com a assinatura
        const finalQuery = `${sortedParams}&signature=${signature}`;
        console.log("📤 Dados enviados:", finalQuery);

        // Envia a ordem para a Binance
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

        // Processa a resposta da ordem para gerar tradeData
        const tradeData = processTradeResponse(data, price, quantity, side);

        // Se for compra, registrar o preço de compra
        if (side === "BUY") {
            global.buyPrice = price;
            console.log(`💰 Novo preço de compra registrado: ${global.buyPrice} USDT`);
        }

        saveTrade(tradeData);

        console.log(`✅ Ordem de ${side} executada com sucesso:`, data);
        return true;
    } catch (err) {
        console.error("🚨 Erro na ordem:", err.response ? err.response.data : err.message);
        return false;
    }
}

module.exports = { getBalance, newOrder, getSymbolFilters };
