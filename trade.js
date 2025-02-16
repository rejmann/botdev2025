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
async function newOrder(symbol, side, lastPrice) { // ⚡ lastPrice agora é um argumento
    const usdtBalance = await getBalance("USDT");

    if (usdtBalance < 5) { // 🚨 Agora verificamos se o saldo atende ao mínimo ($5 USDT)
        console.log("🚨 Saldo insuficiente! Necessário pelo menos $5 USDT para operar.");
        return false;
    }

    // Calcula a quantidade máxima que pode comprar com o saldo disponível
    let quantity = (usdtBalance / lastPrice).toFixed(6); // 🔥 Ajustado para 6 casas decimais

    // Garantindo que a quantidade respeita o mínimo permitido pela Binance (0.00001 BTC)
    if (quantity < 0.00001) {
        console.log("🚨 Quantidade mínima de compra não atendida. Ajustando para 0.00001 BTC...");
        quantity = 0.00001;
    }

    const timestamp = Date.now();
    const params = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
    const signature = crypto.createHmac("sha256", SECRET_KEY)
        .update(params)
        .digest("hex");

    try {
        const { data } = await axios.post(
            `${API_URL}/api/v3/order?${params}&signature=${signature}`, 
            null,
            { headers: { "X-MBX-APIKEY": API_KEY } }
        );
        console.log("✅ Ordem executada com sucesso: ", JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error("🚨 Erro na ordem: ", err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
        return false;
    }
}

module.exports = { newOrder };
