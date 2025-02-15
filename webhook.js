const express = require("express");
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const simpleGit = require("simple-git");

const app = express();
const git = simpleGit();

// Middleware para interpretar JSON enviado pelo GitHub
app.use(bodyParser.json());

app.post("/webhook", (req, res) => {
    console.log("📢 Webhook recebido do GitHub!");

    // Executa `git pull` para puxar a última versão do repositório
    exec("git pull origin main", (err, stdout, stderr) => {
        if (err) {
            console.error("🚨 Erro ao fazer git pull:", err);
            return res.sendStatus(500);
        }
        console.log("✅ Atualização feita com sucesso:", stdout);

        // Reinicia o bot no PM2
        exec("pm2 restart bot-binance", (err, stdout, stderr) => {
            if (err) {
                console.error("🚨 Erro ao reiniciar o bot:", err);
                return res.sendStatus(500);
            }
            console.log("♻️ Bot reiniciado com sucesso pelo PM2:", stdout);
            res.sendStatus(200);
        });
    });
});

// Inicia o servidor na porta 80
app.listen(8080, () => {
    console.log("🚀 Servidor de Webhook rodando na porta 8080!");
});
