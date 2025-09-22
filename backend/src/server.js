require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models'); // usa o sequelize exportado do models/index.js

// Rotas
const authRoutes = require('./routes/auth');
const trilhasRoutes = require('./routes/trilhas');
const arvoresRoutes = require('./routes/arvores');
const perguntasRoutes = require('./routes/perguntas');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// Config
const PORT = process.env.APP_PORT || 3000;
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: allowedOrigins,     // aceita array de origens
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Healthcheck
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Rotas da API
app.use('/api/auth', authRoutes);        // <-- NOVA: signup/login/me
app.use('/api/arvores', arvoresRoutes);
app.use('/api/trilhas', trilhasRoutes);
app.use('/api/perguntas', perguntasRoutes);
app.use('/api/logs', require('./routes/logs'));
app.use('/api/dashboard', dashboardRoutes);


// 404 padrão
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Handler de erro
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: 'Erro interno' });
});

// Start
const start = async () => {
  try {
    await sequelize.authenticate();
    // NÃO use { force: true } em produção
    await sequelize.sync();
    app.listen(PORT, () =>
      console.log(`API rodando em http://localhost:${PORT}`)
    );
  } catch (e) {
    console.error('Falha ao iniciar:', e);
    process.exit(1);
  }
};
start();

