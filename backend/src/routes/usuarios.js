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
      num_arvores_visitadas: 0,
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
        t.trilha_nome,
        t.arvore_codigo,
        a.nome AS arvore_nome
      FROM trofeu t
      INNER JOIN arvore a ON a.codigo = t.arvore_codigo
      WHERE t.usuario_nickname = :nickname
    `, { replacements: { nickname } });

    return res.status(200).json(trofeus.map(t => ({
      trilha_nome: t.trilha_nome,
      arvore_codigo: t.arvore_codigo,
      arvore_nome: t.arvore_nome,
    })));
  } catch (e) {
    console.error('GET /usuarios/:nickname/trofeus', e);
    return res.status(500).json({ error: 'Erro ao buscar troféus' });
  }
});

// POST /api/usuarios/:nickname/trofeus
router.post('/:nickname/trofeus', async (req, res) => {
  try {
    const { nickname } = req.params;
    const { trilha_nome, arvore_codigo } = req.body;

    if (!trilha_nome || !arvore_codigo) {
      return res.status(400).json({ error: 'trilha_nome e arvore_codigo são obrigatórios' });
    }

    const [trofeu, created] = await Trofeu.findOrCreate({
      where: {
        usuario_nickname: nickname,
        trilha_nome: trilha_nome,
        arvore_codigo: arvore_codigo,
      }
    });

    if (created) {
      await Usuario.increment('num_arvores_visitadas', {
        where: { nickname: nickname }
      });
      return res.status(201).json(trofeu.toJSON());
    } else {
      return res.status(200).json(trofeu.toJSON());
    }
  } catch (error) {
    console.error('ERRO AO TENTAR SALVAR O TROFÉU:', error);
    return res.status(500).json({ message: 'Erro interno ao salvar troféu' });
  }
});

// DELETE /api/usuarios/:nickname/trofeus — reinicia só a trilha selecionada
router.delete('/:nickname/trofeus', async (req, res) => {
  try {
    const { nickname } = req.params;
    const { trilha_nome } = req.query;

    if (trilha_nome) {
      // Apaga só os troféus da trilha específica
      const deleted = await Trofeu.destroy({
        where: {
          usuario_nickname: nickname,
          trilha_nome: trilha_nome,
        }
      });

      // Decrementa o contador pelo número de troféus removidos
      if (deleted > 0) {
        await sequelize.query(
          `UPDATE usuario
           SET num_arvores_visitadas = GREATEST(0, num_arvores_visitadas - :deleted)
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
        { num_arvores_visitadas: 0 },
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