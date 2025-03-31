require("dotenv").config()

module.exports = {
  API_URL: process.env.BINANCE_TESTNET === "true" 
    ? "https://testnet.binance.vision" 
    : "https://api.binance.com",
  API_KEY: process.env.BINANCE_API_KEY,
  SECRET_KEY: process.env.BINANCE_SECRET_KEY,
}
