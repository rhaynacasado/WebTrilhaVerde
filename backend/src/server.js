require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));

// Rotas
app.use('/api/arvores', require('./routes/arvores'));
app.use('/api/trilhas', require('./routes/trilhas'));
app.use('/api/perguntas', require('./routes/perguntas'));


// Healthcheck
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Start
const start = async () => {
  try {
    await sequelize.authenticate();
    // NÃO faça { force: true } em produção
    await sequelize.sync(); 
    app.listen(process.env.APP_PORT, () =>
      console.log(`API rodando em http://localhost:${process.env.APP_PORT}`)
    );
  } catch (e) {
    console.error('Falha ao iniciar:', e);
    process.exit(1);
  }
};
start();
