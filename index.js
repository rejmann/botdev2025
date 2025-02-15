const axios = require("axios");
const { API_URL, API_KEY } = require("./config");
const { RSI, ATR } = require("./utils");
const { newOrder } = require("./trade");

const SYMBOL = "BTCUSDT";
const QUANTITY = "0.00006"; // Menor valor permitido ($5)
const PERIOD = 14;
const STOP_LOSS_MULTIPLIER = 1.5; // Stop Loss baseado no ATR
const FEE_RATE = 0.001; // 0.1% por transação
const TOTAL_FEE = FEE_RATE * 2; // 0.2% incluindo compra e venda
const TAKE_PROFIT_PERCENT = 0.15; // 15% de lucro fixo

let buyPrice = 0;
let isOpened = false;

async function start() {
    try {
        const { data } = await axios.get(`${API_URL}/api/v3/klines?limit=100&interval=5m&symbol=${SYMBOL}`, {
            headers: { "X-MBX-APIKEY": API_KEY },
            timeout: 5000, // Timeout de 5s para evitar travamentos
        });

        const candle = data[data.length - 1];
        const lastPrice = parseFloat(candle[4]);

        console.clear();
        console.log("Preço Atual: " + lastPrice);

        const prices = data.map(k => parseFloat(k[4]));
        const rsi = RSI(prices, PERIOD);
        const atr = ATR(prices, 14);
        const takeProfit = buyPrice * (1 + TAKE_PROFIT_PERCENT);
        const stopLoss = buyPrice - atr * STOP_LOSS_MULTIPLIER;

        console.log("RSI: " + rsi);
        console.log("ATR: " + atr);
        console.log("Já comprei? " + isOpened);

        if (rsi < 30 && !isOpened) {
            console.log("Confirmação de compra pelo RSI");
            buyPrice = lastPrice;
            isOpened = true;
            newOrder(SYMBOL, QUANTITY, "BUY");
        } else if (isOpened) {
            let profit = ((lastPrice - buyPrice) / buyPrice) - TOTAL_FEE;

            if (lastPrice >= takeProfit || rsi > 70 || lastPrice <= stopLoss) {
                console.log("Saindo da posição: lucro/prejuízo atingido com taxa incluída");
                newOrder(SYMBOL, QUANTITY, "SELL");
                isOpened = false;
            }
        } else {
            console.log("Aguardando oportunidades...");
        }

    } catch (error) {
        if (error.code === 'ECONNRESET') {
            console.warn("⚠️ Conexão com a Binance foi resetada. Tentando novamente...");
        } else if (error.response && error.response.status === 451) {
            console.error("🚨 Erro 451: API da Binance bloqueou a requisição. Verifique se sua VPS não está na lista de IPs bloqueados.");
        } else {
            console.error("🚨 Erro ao buscar dados da Binance:", error.message);
        }
    }
}

// Executa a cada 3 segundos
setInterval(start, 3000);
start();
