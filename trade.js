const axios = require("axios");
const crypto = require("crypto");
const { API_URL, API_KEY, SECRET_KEY } = require("./config");

async function newOrder(symbol, quantity, side) {
    const timestamp = Date.now();
    const params = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;

    const signature = crypto.createHmac("sha256", SECRET_KEY)
        .update(params)
        .digest("hex");

    const fullParams = `${params}&signature=${signature}`;

    try {
        const { data } = await axios.post(
            `${API_URL}/api/v3/order?${fullParams}`, 
            null, // Binance não aceita body no método POST para este endpoint
            { headers: { "X-MBX-APIKEY": API_KEY } }
        );
        console.log("✅ Ordem executada: ", data);
    } catch (err) {
        console.error("🚨 Erro na ordem: ", err.response ? err.response.data : err.message);
    }
}

module.exports = { newOrder };
