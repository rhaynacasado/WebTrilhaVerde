// src/server.js
require('dotenv').config();
const express = require('express');
const { sequelize } = require('./models'); // exportado do models/index.js

const app = express();

/* ========= Config ========= */
const PORT = process.env.PORT || 3001;

// Origens permitidas (env ou defaults)
const allowedOrigins = (
  (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.trim().length > 0)
    ? process.env.CORS_ORIGIN
    : 'http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:5173,http://localhost:5173'
).split(',').map(s => s.trim());

/* ========= CORS universal (antes de tudo) ========= */
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.sendStatus(204); // preflight
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ========= Health ========= */
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/* ========= Rotas ========= */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/arvores', require('./routes/arvores'));
app.use('/api/trilhas', require('./routes/trilhas'));
app.use('/api/perguntas', require('./routes/perguntas'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/usuarios', require('./routes/usuarios'));

/* ========= 404 / Erros ========= */
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
});

/* ========= Start ========= */
const start = async () => {
  try {
    await sequelize.authenticate(); // conexão com a Neon
    await sequelize.sync();         // cuidado com force/alter em prod
    app.listen(PORT, () =>
      console.log(`API rodando em http://localhost:${PORT}`)
    );
  } catch (e) {
    console.error('Falha ao iniciar:', e);
    process.exit(1);
  }
};
start();
