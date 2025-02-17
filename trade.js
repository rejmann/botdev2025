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
        // 🔹 Obtém informações da conta com assinatura
        const timestamp = Date.now();
        const query = `timestamp=${timestamp}`;
        const signature = crypto.createHmac("sha256", SECRET_KEY)
            .update(query)
            .digest("hex");

        const { data: accountInfo } = await axios.get(
            `${API_URL}/api/v3/account?${query}&signature=${signature}`,
            { headers: { "X-MBX-APIKEY": API_KEY } }
        );

        let usdtBalance = parseFloat(
            accountInfo.balances.find(asset => asset.asset === "USDT").free
        );
        console.log(`💰 Saldo disponível: ${usdtBalance} USDT`);

        // 🔹 Calcula a quantidade de BTC que pode ser comprada com o saldo disponível
        let quantityAvailable = usdtBalance / lastPrice;
        // 🔹 Ajusta para múltiplos mínimos (ex.: 0.00001 BTC)
        let quantity = Math.floor(quantityAvailable * 100000) / 100000;
        quantity = quantity.toFixed(5);

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
        const orderSignature = crypto.createHmac("sha256", SECRET_KEY)
            .update(queryString)
            .digest("hex");

        order.signature = orderSignature;

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


module.exports = { getBalance, newOrder };
