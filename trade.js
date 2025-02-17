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
        const freeBalance = balance ? parseFloat(balance.free) : 0;
        console.log(`🔍 Saldo de ${asset}: ${freeBalance}`);
        return freeBalance;
    } catch (err) {
        console.error("🚨 Erro ao obter saldo:", err.response ? err.response.data : err.message);
        return 0;
    }
}

// 🔥 Nova função para criar ordens de compra/venda
async function newOrder(symbol, side, lastPrice) {
    try {
        // 🔹 Obtém saldo da conta
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
        let btcBalance = parseFloat(
            accountInfo.balances.find(asset => asset.asset === "BTC").free
        );

        console.log(`💰 Saldo USDT: ${usdtBalance} | Saldo BTC: ${btcBalance}`);

        let quantity = 0;

        if (side === "BUY") {
            // 🚨 Verifica se há saldo suficiente para a compra mínima de $5 USDT
            if (usdtBalance < 5) {
                console.log("🚨 Saldo insuficiente! Necessário pelo menos $5 USDT para operar.");
                return false;
            }

            // 🔹 Calcula a quantidade de BTC a ser comprada
            let minQuantity = (5 / lastPrice).toFixed(6); // Mínimo necessário para respeitar NOTIONAL
            quantity = (usdtBalance / lastPrice).toFixed(6);

            // 🔹 Usa a maior entre a mínima e a disponível
            quantity = Math.max(minQuantity, quantity);
        } else if (side === "SELL") {
            // 🚨 Verifica se há saldo de BTC suficiente para vender
            if (btcBalance <= 0) {
                console.log("🚨 Saldo insuficiente para vender BTC.");
                return false;
            }

            quantity = btcBalance.toFixed(6);
        }

        // 🔹 Ajusta para múltiplo de 0.00001 BTC (respeitando LOT_SIZE)
        quantity = (Math.floor(quantity * 100000) / 100000).toFixed(5);

        console.log(`📌 Tentando ${side} ${quantity} BTC a ${lastPrice} USDT`);

        // 🚨 Valida se a quantidade é maior que 0
        if (quantity <= 0) {
            console.log("🚨 Quantidade inválida para ordem! Verifique o saldo.");
            return false;
        }

        // 🔹 Cria os parâmetros da ordem
        const order = {
            symbol,
            side,
            type: "MARKET",
            quantity,
            timestamp: Date.now()
        };

        // 🔹 Ordena os parâmetros alfabeticamente antes de gerar a assinatura
        const sortedParams = Object.keys(order)
            .sort()
            .map(key => `${key}=${order[key]}`)
            .join('&');

        const orderSignature = crypto.createHmac("sha256", SECRET_KEY)
            .update(sortedParams)
            .digest("hex");

        // 🔹 Adiciona a assinatura ao objeto da ordem
        const signedOrder = new URLSearchParams({ ...order, signature: orderSignature }).toString();

        // 🔹 Envia a ordem para a Binance
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

module.exports = { getBalance, newOrder };