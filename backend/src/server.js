// src/server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const app = express();

/* ========= Config ========= */
// A sua lógica de porta já está perfeita para a hospedagem!
const PORT = process.env.PORT || 3001;

/* ========= Middlewares ========= */

// [ALTERADO] Simplifica o CORS para permitir acesso da sua API pública (mobile e web)
app.use(cors());

app.use(express.json({ limit: '10mb' })); // Para o upload de imagens
app.use(express.urlencoded({ extended: true }));

// Entrega os arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../../frontend')));

// Redireciona rotas sem extensão para os arquivos HTML correspondentes
app.get('/pages/dashboard', (_req, res) => res.redirect('/pages/dashboard.html'));
app.get('/pages/redefinicao', (_req, res) => res.redirect('/pages/redefinicao.html'));
app.get('/pages/cadastro', (_req, res) => res.redirect('/pages/cadastro.html'));
app.get('/pages/esqueci', (_req, res) => res.redirect('/pages/esqueci.html'));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, '../../frontend/index.html')));

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
  res.status(err.status || 500).json({ error: err.message || 'Erro interno 1' });
});

/* ========= Start ========= */
const start = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    
    // [ALTERADO] Adiciona '0.0.0.0' para aceitar conexões externas na hospedagem
    app.listen(PORT, '0.0.0.0', () =>
      console.log(`API rodando na porta ${PORT}`)
    );
  } catch (e) {
    console.error('Falha ao iniciar:', e);
    process.exit(1);
  }
};
start();