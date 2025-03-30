import axios from 'axios'

import { getTicketPrice } from '../infrastructure/http/httpRequest'

import { saveState } from './saveState'

// Verifica se já existe BTC na conta ao iniciar
export async function initializeBot(isOpened, buyPrice) {
  try {
    const btcBalance = await getBalance(TICKET_BUY)
    const balanceWallet = await getBalance(TICKET_WALLET)

    if (btcBalance >= 0.00001) {
      isOpened = true
      const ticker = await getTicketPrice(SYMBOL)
      buyPrice = parseFloat(ticker.price)
    } else {
      isOpened = false
      buyPrice = 0
    }

    saveState({
      isOpened,
      buyPrice 
    })
  } catch (error) {
    console.error("Erro ao inicializar o bot:", error.message)
  }
}