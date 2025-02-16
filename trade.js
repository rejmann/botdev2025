const axios = require("axios");
const crypto = require("crypto");
const { API_URL, API_KEY, SECRET_KEY } = require("./config");

// 🔥 Obtém o saldo disponível em USDT
async function getBalance(asset) {
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const signature = crypto.createHmac("sha256", SECRET_KEY)
        .update(query)
        .digest("hex");

    try {
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
async function newOrder(symbol, side) {
    try {
        // Obtém saldo disponível de USDT
        const { data: accountInfo } = await axios.get(`${API_URL}/api/v3/account`, {
            headers: { "X-MBX-APIKEY": API_KEY }
        });

        const usdtBalance = accountInfo.balances.find(asset => asset.asset === "USDT").free;
        console.log(`💰 Saldo disponível: ${usdtBalance} USDT`);

        if (parseFloat(usdtBalance) < 5) {
            console.log("🚨 Saldo insuficiente! Necessário pelo menos $5 USDT para operar.");
            return false;
        }

        // Calcula quantidade com base no saldo disponível e no preço atual do BTC
        const { data: ticker } = await axios.get(`${API_URL}/api/v3/ticker/price?symbol=${symbol}`);
        const lastPrice = parseFloat(ticker.price);
        let quantity = (parseFloat(usdtBalance) / lastPrice).toFixed(6); // Ajusta para 6 casas decimais

        // Ajusta para respeitar o LOT_SIZE da Binance
        quantity = (Math.floor(quantity * 100000) / 100000).toFixed(5); // Arredonda para múltiplo de 0.00001 BTC

        console.log(`📌 Tentando comprar ${quantity} BTC...`);

        const order = {
            symbol,
            side,
            type: "MARKET",
            quantity,
            timestamp: Date.now()
        };

        const signature = crypto.createHmac("sha256", SECRET_KEY)
            .update(new URLSearchParams(order).toString())
            .digest("hex");
        order.signature = signature;

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
