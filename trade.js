// trade.js
const crypto = require("crypto")
const fs = require("fs") // se você precisar usar fs

const axios = require("axios")

const { saveTrade } = require("./tradeModel") // se ainda estiver usando o tradeModel
const { processTradeResponse } = require("./utils")

const MIN_PROFIT_MARGIN = 0.01 // 1% de lucro mínimo
