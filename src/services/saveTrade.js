import fs from 'fs'

const TRADES_FILE = "./trades.json"

// Registra trades em arquivo
export function saveTrade(tradeData) {
  let trades = []
  if (fs.existsSync(TRADES_FILE)) {
    trades = JSON.parse(fs.readFileSync(TRADES_FILE, "utf8"))
  }

  trades.push(tradeData)
  fs.writeFileSync(TRADES_FILE, JSON.stringify(trades, null, 2))
}
