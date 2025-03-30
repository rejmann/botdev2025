const { exec } = require("child_process")
const crypto = require("crypto")

const bodyParser = require("body-parser")
const express = require("express")
require("dotenv").config()

const app = express()
const SECRET_TOKEN = process.env.GITHUB_WEBHOOK_SECRET

// Middleware para interpretar JSON enviado pelo GitHub
app.use(bodyParser.json())

// Função para validar o webhook usando o token secreto
function validateWebhook(req, res, next) {
  const githubSignature = req.headers["x-hub-signature-256"]
  if (!githubSignature) {
    console.error("🚨 Webhook inválido: Sem assinatura.")
    return res.status(401).send("Unauthorized")
  }

  const payload = JSON.stringify(req.body)
  const hmac = crypto.createHmac("sha256", SECRET_TOKEN)
  const expectedSignature = `sha256=${hmac.update(payload).digest("hex")}`

  if (githubSignature !== expectedSignature) {
    console.error("🚨 Webhook inválido: Assinatura incorreta.")
    return res.status(401).send("Unauthorized")
  }

  console.log("✅ Webhook autenticado com sucesso!")
  next()
}

// Rota do webhook
app.post("/webhook", validateWebhook, (req, res) => {
  console.log("📢 Webhook recebido do GitHub!")

  // Executa `git pull` para puxar a última versão do repositório
  exec("git pull origin main", (err, stdout, stderr) => {
    if (err) {
      console.error("🚨 Erro ao fazer git pull:", err.message || stderr)
      return res.status(500).send("Erro ao atualizar o repositório.")
    }

    console.log("✅ Atualização feita com sucesso:", stdout)

    // Reinicia o bot no PM2
    exec("pm2 restart bot-binance", (err, stdout, stderr) => {
      if (err) {
        console.error("🚨 Erro ao reiniciar o bot:", err.message || stderr)
        return res.status(500).send("Erro ao reiniciar o bot.")
      }

      console.log("♻️ Bot reiniciado com sucesso pelo PM2:", stdout)
      res.status(200).send("Atualização e reinício concluídos com sucesso!")
    })
  })
})

// Inicia o servidor na porta 8080
app.listen(8080, () => {
  console.log("🚀 Servidor de Webhook rodando na porta 8080!")
})