// db.js
require('dotenv').config(); // Carrega as variáveis do .env
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,       // Endpoint do RDS
  port: process.env.DB_PORT,       // Geralmente 5432
  user: process.env.DB_USER,       // Seu usuário do banco
  password: process.env.DB_PASSWORD, // Sua senha
  database: process.env.DB_NAME,   // Nome do banco de dados
  ssl: { rejectUnauthorized: false } // Necessário para conexões seguras, se aplicável
});

module.exports = pool;
