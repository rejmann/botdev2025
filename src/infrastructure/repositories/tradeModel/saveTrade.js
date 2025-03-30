import pool from './../../../infrastructure/database/conection.js'

export async function saveTrade(trade) {
  const query = `
    INSERT INTO trades (timestamp, symbol, side, price, quantity, fee, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id;
  `
  const values = [
    trade.timestamp,
    trade.symbol,
    trade.side,
    trade.price,
    trade.quantity,
    trade.fee,
    trade.status
  ]
  try {
    const res = await pool.query(query, values)
    console.log(`Trade salvo com sucesso com ID: ${res.rows[0].id}`)
  } catch (error) {
    console.error("Erro ao salvar trade:", error.message)
  }
}
