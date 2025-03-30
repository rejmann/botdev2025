import { getAccountInfo } from '../../infrastructure/http/httpRequest.js'

// 🔥 Função para obter saldo disponível
export async function getBalance(asset) {
  try {
    const accountInfo = getAccountInfo()

    if (!accountInfo.balances) {
      throw new Error("Saldo não disponível")
    }

    const balance = accountInfo.balances.find(b => b.asset === asset)
    return balance ? parseFloat(balance.free) : 0
  } catch (err) {
    console.error("Erro ao obter saldo:", err.response ? JSON.stringify(err.response.data) : err.message)
    return 0
  }
}