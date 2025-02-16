const axios = require("axios");
const crypto = require("crypto");
const { API_URL, API_KEY, SECRET_KEY } = require("./config");

async function getBalance(asset) {
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const signature = crypto.createHmac("sha256", SECRET_KEY)
        .update(query)
        .digest("hex");

    try {
        const { data } = await axios.get(
            `${API_URL}/api/v3/account?${query}&signature=${signature}`,
            { headers: { "X-MBX-APIKEY": API_KEY } }
        );

        const balance = data.balances.find(b => b.asset === asset);
        return balance ? parseFloat(balance.free) : 0;
    } catch (err) {
        console.error("🚨 Erro ao obter saldo: ", err.response ? err.response.data : err.message);
        return 0;
    }
}

async function newOrder(symbol, side) {
    const usdtBalance = await getBalance("USDT");

    if (usdtBalance < 5) {
        console.log("🚨 Saldo insuficiente! Necessário pelo menos $5 USDT para operar.");
        return false; // 🚨 Retorna falso se não puder comprar
    }

    const { data } = await axios.get(`${API_URL}/api/v3/ticker/price?symbol=${symbol}`);
    const price = parseFloat(data.price);
    const quantity = (usdtBalance / price).toFixed(6);

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
        console.log("✅ Ordem executada com sucesso: ", JSON.stringify(data, null, 2)); // Log mais detalhado
        return true; // ✅ Retorna verdadeiro se a compra foi feita
    } catch (err) {
        console.error("🚨 Erro na ordem: ", err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
        return false; // ❌ Retorna falso se falhar
    }
}



module.exports = { newOrder };
