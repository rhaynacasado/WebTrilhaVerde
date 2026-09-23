// backend/src/routes/usuarios.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

const { Usuario, Trofeu, Arvore, sequelize } = require('../models');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// POST /api/usuarios
router.post('/', async (req, res) => {
  try {
    const { nickname, nome, avatar_foto, idade, ano_escolar } = req.body;
    if (!nickname || !nome) {
      return res.status(400).json({ error: 'nickname e nome são obrigatórios' });
    }

    const exists = await Usuario.findByPk(nickname);
    if (exists) return res.status(409).json({ error: 'nickname já cadastrado' });

    const created = await Usuario.create({
      nickname,
      nome,
      avatar_foto: avatar_foto ?? null,
      idade: idade ?? null,
      ano_escolar: ano_escolar ?? null,
      num_pontos_visitados: 0,
    });

    return res.status(201).json(created.toJSON());
  } catch (e) {
    console.error('POST /usuarios', e);
    return res.status(400).json({ error: 'Erro ao cadastrar usuário' });
  }
});

// GET /api/usuarios/:nickname
router.get('/:nickname', async (req, res) => {
  try {
    const u = await Usuario.findByPk(req.params.nickname);
    if (!u) return res.status(404).json({ error: 'Usuário não encontrado' });
    return res.json(u.toJSON());
  } catch (e) {
    console.error('GET /usuarios/:nickname', e);
    return res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// POST /api/usuarios/:nickname/avatar
router.post('/:nickname/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { nickname } = req.params;
    const { foto_mime } = req.body;
    const foto_bytes = req.file.buffer;

    if (!req.file || !foto_mime) {
      return res.status(400).json({ error: 'Arquivo e mime type são obrigatórios.' });
    }

    const usuario = await Usuario.findByPk(nickname);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    usuario.avatar_foto = foto_bytes;
    usuario.foto_mime = foto_mime;

    await usuario.save();

    return res.status(200).json({ message: 'Avatar atualizado com sucesso' });
  } catch (e) {
    console.error('POST /usuarios/:nickname/avatar', e);
    return res.status(500).json({ error: 'Erro ao processar upload do avatar' });
  }
});

// GET /api/usuarios/:nickname/avatar
router.get('/:nickname/avatar', async (req, res) => {
  try {
    const { nickname } = req.params;
    const usuario = await Usuario.findByPk(nickname);

    if (!usuario || !usuario.avatar_foto || !usuario.foto_mime) {
      return res.status(404).json({ error: 'Avatar não encontrado' });
    }

    res.setHeader('Content-Type', usuario.foto_mime);
    return res.send(usuario.avatar_foto);
  } catch (e) {
    console.error('GET /usuarios/:nickname/avatar', e);
    return res.status(500).json({ error: 'Erro ao buscar avatar' });
  }
});

// GET /api/usuarios/:nickname/trofeus
router.get('/:nickname/trofeus', async (req, res) => {
  try {
    const { nickname } = req.params;

    const [trofeus] = await sequelize.query(`
      SELECT
        t.usuario_nickname,
        t.ponto_interesse_codigo,
        p.nome AS ponto_interesse_nome
      FROM trofeu t
      INNER JOIN ponto_interesse p ON p.codigo = t.ponto_interesse_codigo
      WHERE t.usuario_nickname = :nickname
    `, { replacements: { nickname } });

    return res.status(200).json(trofeus);
  } catch (e) {
    console.error('GET /usuarios/:nickname/trofeus', e);
    return res.status(500).json({ error: 'Erro ao buscar troféus' });
  }
});

// POST /api/usuarios/:nickname/trofeus
router.post('/:nickname/trofeus', async (req, res) => {
  try {
    const { nickname } = req.params;
    const ponto_interesse_codigo = Number(req.body.ponto_interesse_codigo);

    if (!ponto_interesse_codigo) {
      return res.status(400).json({ error: 'ponto_interesse_codigo é obrigatório' });
    }

    const [trofeu, created] = await Trofeu.findOrCreate({
      where: {
        usuario_nickname: nickname,
        ponto_interesse_codigo,
      }
    });

    if (created) {
      await Usuario.increment('num_pontos_visitados', {
        where: { nickname: nickname }
      });
    }
    // sempre 201: o app trata qualquer outro status como falha, inclusive troféu já existente
    return res.status(201).json(trofeu.toJSON());
  } catch (error) {
    console.error('ERRO AO TENTAR SALVAR O TROFÉU:', error);
    return res.status(500).json({ message: 'Erro interno ao salvar troféu' });
  }
});

// DELETE /api/usuarios/:nickname/trofeus — reinicia só a trilha selecionada
router.delete('/:nickname/trofeus', async (req, res) => {
  try {
    const { nickname } = req.params;
    // o app envia ?trilha=; ?trilha_nome= continua aceito
    const trilha_nome = req.query.trilha || req.query.trilha_nome;

    if (trilha_nome) {
      // Apaga só os troféus dos pontos que pertencem à trilha
      const [deletedRows] = await sequelize.query(
        `DELETE FROM trofeu
         WHERE usuario_nickname = :nickname
           AND ponto_interesse_codigo IN (
             SELECT ponto_interesse_codigo FROM ponto_interesse_trilha WHERE trilha_nome = :trilha_nome
           )
         RETURNING ponto_interesse_codigo`,
        { replacements: { nickname, trilha_nome } }
      );
      const deleted = deletedRows.length;

      // Decrementa o contador pelo número de troféus removidos
      if (deleted > 0) {
        await sequelize.query(
          `UPDATE usuario
           SET num_pontos_visitados = GREATEST(0, num_pontos_visitados - :deleted)
           WHERE nickname = :nickname`,
          { replacements: { deleted, nickname } }
        );
      }
    } else {
      // Apaga todos os troféus do usuário
      await Trofeu.destroy({
        where: { usuario_nickname: nickname }
      });
      await Usuario.update(
        { num_pontos_visitados: 0 },
        { where: { nickname } }
      );
    }

    return res.status(204).send();
  } catch (e) {
    console.error('DELETE /usuarios/:nickname/trofeus', e);
    return res.status(500).json({ error: 'Erro ao reiniciar progresso' });
  }
});

module.exports = router;