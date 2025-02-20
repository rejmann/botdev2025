const axios = require("axios");
const { API_URL, API_KEY } = require("./config");
const { RSI, ATR, calculateBollingerBands, calculateMACD } = require("./utils");
const { getBalance, newOrder, getSymbolFilters } = require("./trade");
const fs = require("fs");

const SYMBOL = "BTCUSDT";
const PERIOD = 14;
const FEE_RATE = 0.001; // 0.1% por transação
const TOTAL_FEE = FEE_RATE * 2; // 0.2% incluindo compra e venda
const TAKE_PROFIT_PERCENT = 0.15; // 15% de lucro fixo
const STATE_FILE = "./state.json";

// 🔧 Carrega o estado do arquivo JSON
function loadState() {
    if (fs.existsSync(STATE_FILE)) {
        const data = fs.readFileSync(STATE_FILE, "utf8");
        return JSON.parse(data);
    }
    return { isOpened: false, buyPrice: 0 };
}

// 🔧 Salva o estado no arquivo JSON
function saveState() {
    const state = { isOpened, buyPrice };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// 🔧 Inicializa o estado ao iniciar o bot
let state = loadState();
let isOpened = state.isOpened;
let buyPrice = state.buyPrice;

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
        saveState(); // Salva o estado inicial
    } catch (error) {
        console.error("🚨 Erro ao inicializar o bot:", error.message);
    }
}

// 🔧 Função principal do bot
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
        const bollinger = calculateBollingerBands(prices);
        const macd = calculateMACD(prices);

        const stopLoss = buyPrice - atr * 1.5; // Stop-loss baseado no ATR
        const takeProfit = buyPrice + atr * 2.0; // Take-profit baseado no ATR

        console.log("📉 RSI: " + rsi.toFixed(2));
        console.log("📊 ATR: " + atr.toFixed(2));
        console.log("📈 Bandas de Bollinger: Upper=" + bollinger.upper.toFixed(2) + ", Lower=" + bollinger.lower.toFixed(2));
        console.log("📊 MACD: Line=" + macd.line.toFixed(2) + ", Signal=" + macd.signal.toFixed(2));
        console.log("🤖 Já comprei? " + isOpened);

        // 🔹 Verifica se é hora de comprar
        if (rsi < 30 && !isOpened) {
            console.log("✅ Confirmação de compra pelo RSI");
            const orderSuccess = await placeOrder(SYMBOL, "BUY", lastPrice);
            if (orderSuccess) {
                isOpened = true;
                buyPrice = lastPrice; // Define o preço de compra
                saveState(); // Salva o estado após a compra
                console.log("🚀 Compra realizada com sucesso!");
            } else {
                console.log("🚨 Compra falhou! Tentará novamente na próxima verificação.");
            }
        }

        // 🔹 Verifica se é hora de vender
        else if (isOpened) {
            let profit = ((lastPrice - buyPrice) / buyPrice) - TOTAL_FEE;
            console.log(`📈 Lucro estimado: ${(profit * 100).toFixed(2)}%`);

            // Só vende se houver lucro positivo, RSI > 70, ou stop-loss/take-profit atingidos
            if (lastPrice <= stopLoss || lastPrice >= takeProfit || rsi > 70) {
                console.log("💰 Saindo da posição: stop-loss, take-profit ou RSI alto");
                const sellSuccess = await placeOrder(SYMBOL, "SELL", lastPrice);
                if (sellSuccess) {
                    isOpened = false;
                    buyPrice = 0; // Reseta o preço de compra
                    saveState(); // Salva o estado após a venda
                    console.log("✅ Venda realizada com sucesso!");
                } else {
                    console.log("🚨 Venda falhou! Tentará novamente na próxima verificação.");
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

// Função para ajustar a quantidade de acordo com o stepSize
function quantizeQuantity(amount, stepSize) {
    // Determina quantas casas decimais o stepSize possui
    const decimals = (stepSize.toString().split('.')[1] || '').length;
    // Arredonda para baixo conforme a precisão permitida
    return parseFloat(Math.floor(amount * Math.pow(10, decimals)) / Math.pow(10, decimals));
  }
  
  async function placeOrder(symbol, side, price) {
    try {
        const filters = await getSymbolFilters(symbol);
        if (!filters) return false;

        const minQty = filters.LOT_SIZE.minQty;
        const stepSize = filters.LOT_SIZE.stepSize;

        let quantity = 0;
        if (side === "BUY") {
            const usdtBalance = await getBalance("USDT");
            // Calcula a quantidade máxima de BTC que pode ser comprada com o saldo disponível
            const maxQuantity = usdtBalance / price;
            quantity = quantizeQuantity(maxQuantity, stepSize);
        } else if (side === "SELL") {
            const btcBalance = await getBalance("BTC");
            quantity = quantizeQuantity(btcBalance, stepSize);
        }

        if (quantity < minQty) {
            console.error("🚨 Quantidade inválida para ordem!");
            return false;
        }

        console.log(`📌 Tentando ${side} ${quantity} BTC a ${price} USDT`);
        const orderSuccess = await newOrder(symbol, side, price);
        return orderSuccess;
    } catch (error) {
        console.error("🚨 Erro ao colocar ordem:", error.message);
        return false;
    }
}

  
  

// 🔧 Função para colocar ordens com validação de quantidade
async function placeOrder(symbol, side, price) {
    try {
        const filters = await getSymbolFilters(symbol);
        if (!filters) return false;

        const minQty = filters.LOT_SIZE.minQty;
        const stepSize = filters.LOT_SIZE.stepSize;

        let quantity = 0;
        if (side === "BUY") {
            const usdtBalance = await getBalance("USDT");
            quantity = Math.floor((usdtBalance / price) / stepSize) * stepSize;
        } else if (side === "SELL") {
            const btcBalance = await getBalance("BTC");
            quantity = Math.floor(btcBalance / stepSize) * stepSize;
        }

        if (quantity < minQty) {
            console.error("🚨 Quantidade inválida para ordem!");
            return false;
        }

        console.log(`📌 Tentando ${side} ${quantity} BTC a ${price} USDT`);
        const orderSuccess = await newOrder(symbol, side, price);
        return orderSuccess;
    } catch (error) {
        console.error("🚨 Erro ao colocar ordem:", error.message);
        return false;
    }
}

// 🔧 Inicializa verificando o status da conta antes de iniciar o loop
initializeBot().then(() => {
    setInterval(start, 3000); // Executa a função `start` a cada 3 segundos
    start(); // Executa imediatamente ao iniciar
});