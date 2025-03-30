import crypto from 'crypto'

import axios from 'axios'
// 🔥 Função para obter saldo disponível
export async function getBalance(asset) {
  try {
    const timestamp = Date.now()
    const query = `timestamp=${timestamp}`
    const signature = crypto.createHmac("sha256", SECRET_KEY)
      .update(query)
      .digest("hex")

    const { data: accountInfo } = await axios.get(
      `${API_URL}/api/v3/account?${query}&signature=${signature}`,
      {
        headers: {
          "X-MBX-APIKEY": API_KEY 
        } 
      }
    )

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