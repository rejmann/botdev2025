const axios = require("axios");
const fs = require("fs");
const { API_URL, API_KEY } = require("./config");
const { RSI, ATR, calculateBollingerBands, calculateMACD } = require("./utils");
const { getBalance, newOrder, getSymbolFilters } = require("./trade");

const SYMBOL = "BTCUSDT";
const PERIOD = 14;
const FEE_RATE = 0.001;
const TOTAL_FEE = FEE_RATE * 2;
const TAKE_PROFIT_PERCENT = 0.15;
const STATE_FILE = "./state.json";
const TRADES_FILE = "./trades.json";

// Carrega o estado do bot de um arquivo JSON
function loadState() {
    if (fs.existsSync(STATE_FILE)) {
        return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    }
    return { isOpened: false, buyPrice: 0 };
}

// Salva o estado do bot no arquivo JSON
function saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Registra trades em um arquivo JSON
function saveTrade(tradeData) {
    let trades = [];
    if (fs.existsSync(TRADES_FILE)) {
        trades = JSON.parse(fs.readFileSync(TRADES_FILE, "utf8"));
    }
    trades.push(tradeData);
    fs.writeFileSync(TRADES_FILE, JSON.stringify(trades, null, 2));
}

// Inicializa o estado do bot
let state = loadState();
let isOpened = state.isOpened;
let buyPrice = state.buyPrice;

// Inicializa verificando o saldo da conta
async function initializeBot() {
    try {
        const btcBalance = await getBalance("BTC");
        const usdtBalance = await getBalance("USDT");

        if (btcBalance >= 0.00001) {
            isOpened = true;
            const { data: ticker } = await axios.get(`${API_URL}/api/v3/ticker/price?symbol=${SYMBOL}`);
            buyPrice = parseFloat(ticker.price);
        } else {
            isOpened = false;
            buyPrice = 0;
        }
        saveState({ isOpened, buyPrice });
    } catch (error) {
        console.error("Erro ao inicializar o bot:", error.message);
    }
}

// Função principal do bot
async function start() {
    try {
        const { data } = await axios.get(`${API_URL}/api/v3/klines?limit=100&interval=5m&symbol=${SYMBOL}`, {
            headers: { "X-MBX-APIKEY": API_KEY },
            timeout: 5000,
        });

        const candle = data[data.length - 1];
        const lastPrice = parseFloat(candle[4]);
        const prices = data.map(k => parseFloat(k[4]));

        const rsi = RSI(prices, PERIOD);
        const atr = ATR(prices, 14);
        const bollinger = calculateBollingerBands(prices);
        const macd = calculateMACD(prices);

        const stopLoss = buyPrice - atr * 1.5;
        const takeProfit = buyPrice + atr * 2.0;

        console.log(`Preço Atual: ${lastPrice}`);
        console.log(`RSI: ${rsi.toFixed(2)}`);
        console.log(`ATR: ${atr.toFixed(2)}`);
        console.log(`Bollinger Bands: Upper=${bollinger.upper.toFixed(2)}, Lower=${bollinger.lower.toFixed(2)}`);
        console.log(`MACD: Line=${macd.line.toFixed(2)}, Signal=${macd.signal.toFixed(2)}`);
        console.log(`Já comprou? ${isOpened}`);

        if (rsi < 30 && !isOpened) {
            console.log("Confirmação de compra pelo RSI");
            const orderSuccess = await placeOrder(SYMBOL, "BUY", lastPrice);
            if (orderSuccess) {
                isOpened = true;
                buyPrice = lastPrice;
                saveState({ isOpened, buyPrice });
                console.log("Compra realizada com sucesso");
            } else {
                console.log("Compra falhou, tentará novamente");
            }
        } else if (isOpened) {
            let profit = ((lastPrice - buyPrice) / buyPrice) - TOTAL_FEE;
            console.log(`Lucro estimado: ${(profit * 100).toFixed(2)}%`);

            if (lastPrice <= stopLoss || lastPrice >= takeProfit || rsi > 70) {
                console.log("Saindo da posição: stop-loss, take-profit ou RSI alto");
                const sellSuccess = await placeOrder(SYMBOL, "SELL", lastPrice);
                if (sellSuccess) {
                    isOpened = false;
                    buyPrice = 0;
                    saveState({ isOpened, buyPrice });
                    console.log("Venda realizada com sucesso");
                } else {
                    console.log("Venda falhou, tentará novamente");
                }
            }
        } else {
            console.log("Aguardando oportunidades");
        }
    } catch (error) {
        console.error("Erro ao buscar dados da Binance:", error.message);
    }
}

// Ajusta a quantidade de acordo com o stepSize
function quantizeQuantity(amount, stepSize) {
    const decimals = (stepSize.toString().split('.')[1] || '').length;
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
            const maxQuantity = usdtBalance / price;
            quantity = quantizeQuantity(maxQuantity, stepSize);
        } else if (side === "SELL") {
            const btcBalance = await getBalance("BTC");
            quantity = quantizeQuantity(btcBalance, stepSize);
        }

        if (quantity < minQty) {
            console.error("Quantidade inválida para ordem");
            return false;
        }

        console.log(`Tentando ${side} ${quantity} BTC a ${price} USDT`);
        const orderSuccess = await newOrder(symbol, side, price);

        if (orderSuccess) {
            saveTrade({
                timestamp: Date.now(),
                symbol,
                side,
                price,
                quantity,
                status: "FILLED",
            });
        }

        return orderSuccess;
    } catch (error) {
        console.error("Erro ao colocar ordem:", error.message);
        return false;
    }
}

// Inicializa o bot e executa periodicamente
initializeBot().then(() => {
    setInterval(start, 3000);
    start();
});
