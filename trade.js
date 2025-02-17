const axios = require("axios");
const crypto = require("crypto");
const { API_URL, API_KEY, SECRET_KEY } = require("./config");

// 🔥 Obtém o saldo disponível em USDT ou qualquer outro ativo
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
        console.error("🚨 Erro ao obter saldo:", err.response ? err.response.data : err.message);
        return 0;
    }
}

// 🔧 Função para obter os filtros do símbolo
async function getSymbolFilters(symbol) {
    try {
        const { data } = await axios.get(`${API_URL}/api/v3/exchangeInfo`);
        const symbolInfo = data.symbols.find(s => s.symbol === symbol);
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

// 🔥 Nova função para criar ordens de compra/venda
async function newOrder(symbol, side, price) {
    try {
        // Obtém os filtros do símbolo
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
            quantity = Math.floor((usdtBalance / price) / stepSize) * stepSize;
        } else if (side === "SELL") {
            const btcBalance = await getBalance("BTC");
            quantity = Math.floor(btcBalance / stepSize) * stepSize;
        }

        // Valida a quantidade mínima
        if (quantity < minQty) {
            console.error(`🚨 Quantidade inválida para ordem! Mínimo permitido: ${minQty}`);
            return false;
        }

        // Cria os parâmetros da ordem
        const timestamp = Date.now();
        const order = {
            symbol,
            side,
            type: "MARKET",
            quantity: quantity.toFixed(6), // Limita a 6 casas decimais
            timestamp
        };

        // Ordena os parâmetros alfabeticamente antes de gerar a assinatura
        const sortedParams = Object.keys(order)
            .sort()
            .map(key => `${key}=${order[key]}`)
            .join('&');

        const orderSignature = crypto.createHmac("sha256", SECRET_KEY)
            .update(sortedParams)
            .digest("hex");

        const signedOrder = new URLSearchParams({ ...order, signature: orderSignature }).toString();

        // Envia a ordem para a Binance
        const { data } = await axios.post(
            `${API_URL}/api/v3/order`,
            signedOrder,
            { headers: { "X-MBX-APIKEY": API_KEY } }
        );

        console.log(`✅ Ordem de ${side} executada com sucesso:`, data);
        return true;
    } catch (err) {
        console.error("🚨 Erro na ordem: ", err.response ? err.response.data : err.message);
        return false;
    }
}

module.exports = { getBalance, newOrder, getSymbolFilters };