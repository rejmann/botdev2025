const axios = require("axios");
const crypto = require("crypto");
const { API_URL, API_KEY, SECRET_KEY } = require("./config");

async function newOrder(symbol, quantity, side) {
    const order = { symbol, side, type: "MARKET", quantity, timestamp: Date.now() };
    const signature = crypto.createHmac("sha256", SECRET_KEY)
        .update(new URLSearchParams(order).toString())
        .digest("hex");
    order.signature = signature;

    try {
        const { data } = await axios.post(
            `${API_URL}/api/v3/order`, 
            new URLSearchParams(order).toString(), 
            { headers: { "X-MBX-APIKEY": API_KEY } }
        );
        console.log("Ordem executada: ", data);
    } catch (err) {
        console.error("Erro na ordem: ", err.response.data);
    }
}

module.exports = { newOrder };
