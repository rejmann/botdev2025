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

        const { data } = await axios.get(`${API_URL}/api/v3/account?${query}&signature=${signature}`, {
            headers: { "X-MBX-APIKEY": API_KEY }
        });

        const balance = data.balances.find(b => b.asset === asset);
        return balance ? parseFloat(balance.free) : 0;
    } catch (err) {
        console.error("🚨 Erro ao obter saldo:", err.response ? err.response.data : err.message);
        return 0;
    }
}

// 🔥 Nova função para criar ordens de compra/venda

async function newOrder(symbol, side, lastPrice) {
    try {
        // 🔹 Obtém saldo disponível de USDT
        const { data: accountInfo } = await axios.get(`${API_URL}/api/v3/account`, {
            headers: { "X-MBX-APIKEY": API_KEY }
        });

        let usdtBalance = parseFloat(accountInfo.balances.find(asset => asset.asset === "USDT").free);
        console.log(`💰 Saldo disponível: ${usdtBalance} USDT`);

        if (usdtBalance < 5) {
            console.log("🚨 Saldo insuficiente! Necessário pelo menos $5 USDT para operar.");
            return false;
        }

        // 🔹 Calcula a quantidade mínima necessária para atingir $5 USDT
        let minQuantity = (5 / lastPrice).toFixed(6); // Garante que será maior que $5
        let quantity = (usdtBalance / lastPrice).toFixed(6);

        // 🔹 Usa a quantidade maior entre a mínima e a disponível
        quantity = Math.max(minQuantity, quantity).toFixed(6);        ;

        // 🔹 Ajusta para múltiplo de 0.00001 BTC (respeitando LOT_SIZE)
        quantity = (Math.floor(quantity * 100000) / 100000).toFixed(5);

        console.log(`📌 Tentando ${side} ${quantity} BTC a ${lastPrice} USDT`);

        // 🔹 Cria os parâmetros da ordem
        const order = {
            symbol,
            side,
            type: "MARKET",
            quantity,
            timestamp: Date.now()
        };

        // 🔹 Assina a requisição com HMAC-SHA256
        const queryString = new URLSearchParams(order).toString();
        const signature = crypto.createHmac("sha256", SECRET_KEY)
            .update(queryString)
            .digest("hex");

        order.signature = signature;

        // 🔹 Envia a ordem para a Binance
        const { data } = await axios.post(
            `${API_URL}/api/v3/order`,
            new URLSearchParams(order).toString(),
            { headers: { "X-MBX-APIKEY": API_KEY } }
        );

        console.log(`✅ Ordem de ${side} executada com sucesso:`, data);
        return true;
    } catch (err) {
        console.error("🚨 Erro na ordem: ", err.response ? err.response.data : err.message);
        return false;
    }
}

module.exports = { newOrder };


module.exports = { getBalance, newOrder };
