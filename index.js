const axios = require("axios");
const { API_URL, API_KEY } = require("./config");
const { RSI, ATR } = require("./utils");
const { getBalance, newOrder } = require("./trade");
const SYMBOL = "BTCUSDT";
const PERIOD = 14;
const STOP_LOSS_MULTIPLIER = 1.5; // Stop Loss baseado no ATR
const FEE_RATE = 0.001; // 0.1% por transação
const TOTAL_FEE = FEE_RATE * 2; // 0.2% incluindo compra e venda
const TAKE_PROFIT_PERCENT = 0.10; // 10% de lucro fixo
let buyPrice = 0;
let isOpened = false;

// 🔧 Função para inicializar o bot e verificar o estado inicial da conta
async function initializeBot() {
    console.log("🔄 Verificando status inicial da conta...");
    try {
        // Obtém saldo de BTC e USDT
        const btcBalance = await getBalance("BTC");
        const usdtBalance = await getBalance("USDT");
        console.log(`💰 Saldo BTC: ${btcBalance} | Saldo USDT: ${usdtBalance}`);

        if (btcBalance >= 0.00001) {
            console.log("✅ BTC encontrado na conta! Mantendo posição aberta.");
            isOpened = true;

            // Obtém o preço atual do BTC para definir o `buyPrice`
            const { data: ticker } = await axios.get(`${API_URL}/api/v3/ticker/price?symbol=${SYMBOL}`);
            buyPrice = parseFloat(ticker.price);
            console.log(`📌 Definindo buyPrice inicial: ${buyPrice}`);
        } else {
            console.log("🔹 Nenhum BTC encontrado. Aguardando oportunidade de compra.");
            isOpened = false;
            buyPrice = 0; // Reinicia para evitar erros
        }
    } catch (error) {
        console.error("🚨 Erro ao inicializar o bot:", error.message);
    }
}

// 🚀 Função principal do bot
async function start() {
    try {
        // Obtém os dados do último candle
        const { data } = await axios.get(
            `${API_URL}/api/v3/klines?limit=100&interval=5m&symbol=${SYMBOL}`,
            {
                headers: { "X-MBX-APIKEY": API_KEY },
                timeout: 5000,
            }
        );
        const candle = data[data.length - 1];
        const lastPrice = parseFloat(candle[4]);
        console.clear();
        console.log("📌 Preço Atual: " + lastPrice);

        const prices = data.map(k => parseFloat(k[4]));
        const rsi = RSI(prices, PERIOD);
        const atr = ATR(prices, 14);
        const takeProfit = buyPrice * (1 + TAKE_PROFIT_PERCENT);
        const stopLoss = buyPrice - atr * STOP_LOSS_MULTIPLIER;

        console.log("📉 RSI: " + rsi.toFixed(2));
        console.log("📊 ATR: " + atr.toFixed(2));
        console.log("🤖 Já comprei? " + isOpened);

        // 🔹 Verifica se é hora de comprar
        if (rsi < 30 && !isOpened) {
            console.log("✅ Confirmação de compra pelo RSI");
            const orderSuccess = await newOrder(SYMBOL, "BUY", lastPrice);
            if (orderSuccess) {
                isOpened = true;
                buyPrice = lastPrice; // Define o preço de compra
                console.log("🚀 Compra realizada com sucesso!");
            } else {
                console.log("🚨 Compra falhou! Tentará novamente na próxima verificação.");
            }
        }

        // 🔹 Verifica se é hora de vender
        else if (isOpened) {
            let profit = ((lastPrice - buyPrice) / buyPrice) - TOTAL_FEE;
            console.log(`📈 Lucro estimado: ${(profit * 100).toFixed(2)}%`);

            if (profit >= 0 || lastPrice <= stopLoss || rsi > 70) {
                console.log("💰 Saindo da posição: lucro/prejuízo atingido com taxa incluída");
                const sellSuccess = await newOrder(SYMBOL, "SELL", lastPrice);
                if (sellSuccess) {
                    isOpened = false;
                    buyPrice = 0; // Reseta o preço de compra
                    console.log("✅ Venda realizada com sucesso!");
                }
            }
        } else {
            console.log("⏳ Aguardando oportunidades...");
        }
    } catch (error) {
        if (error.code === "ECONNRESET") {
            console.warn("⚠️ Conexão com a Binance foi resetada. Tentando novamente...");
        } else if (error.response && error.response.status === 451) {
            console.error("🚨 Erro 451: API da Binance bloqueou a requisição. Verifique sua VPS.");
        } else {
            console.error("🚨 Erro ao buscar dados da Binance:", error.message);
        }
    }
}

// 🔄 Inicializa verificando o status da conta antes de iniciar o loop
initializeBot().then(() => {
    setInterval(start, 3000); // Executa a função `start` a cada 3 segundos
    start(); // Executa imediatamente ao iniciar
});