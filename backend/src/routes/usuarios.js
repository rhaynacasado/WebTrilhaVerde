// backend/src/routes/usuarios.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

// Importe os modelos necessários
const { Usuario, Trofeu, Arvore } = require('../models');

// Configuração do Multer para guardar o arquivo na memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// POST /api/usuarios  (criar novo ou 409 se nickname existir)
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


// ROTA PARA UPLOAD DO AVATAR
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

// ROTA PARA BUSCAR/DOWNLOAD DO AVATAR
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

// ROTA PARA BUSCAR OS TROFÉUS DE UM USUÁRIO
router.get('/:nickname/trofeus', async (req, res) => {
  try {
    const { nickname } = req.params;

    const trofeus = await Trofeu.findAll({
      where: { usuario_nickname: nickname },
      include: [{
        model: Arvore,
        as: 'Arvore',
        attributes: ['nome'], 
        required: true 
      }]
    });

    const resultadoFormatado = trofeus.map(t => ({
      trilha_nome: t.trilha_nome,
      arvore_codigo: t.arvore_codigo,
      arvore_nome: t.Arvore.nome 
    }));

    return res.status(200).json(resultadoFormatado);

  } catch (e) {
    console.error('GET /usuarios/:nickname/trofeus', e);
    return res.status(500).json({ error: 'Erro ao buscar troféus' });
  }
});

// ROTA PARA CRIAR UM TROFÉU
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
        arvore_codigo: arvore_codigo
      }
    });

    if (created) {
      await Usuario.increment('num_arvores_visitadas', { where: { nickname: nickname } });
      return res.status(201).json(trofeu.toJSON());
    } else {
      return res.status(200).json(trofeu.toJSON());
    }

  } catch (error) {
    console.error('ERRO AO TENTAR SALVAR O TROFÉU:', error);
    return res.status(500).json({ message: 'Erro interno ao salvar troféu' });
  }
});

// [NOVO] ROTA PARA DELETAR TODOS OS TROFÉUS (REINICIAR JOGO)
router.delete('/:nickname/trofeus', async (req, res) => {
  try {
    const { nickname } = req.params;

    // Apaga todos os registros da tabela 'trofeu' para este usuário
    await Trofeu.destroy({
      where: { usuario_nickname: nickname }
    });

    // Zera o contador de árvores visitadas do usuário
    await Usuario.update({ num_arvores_visitadas: 0 }, {
      where: { nickname: nickname }
    });
    
    console.log(`Progresso do usuário ${nickname} reiniciado.`);
    return res.status(204).send(); // 204 No Content indica sucesso

  } catch (e) {
    console.error('DELETE /usuarios/:nickname/trofeus', e);
    return res.status(500).json({ error: 'Erro ao reiniciar progresso' });
  }
});


module.exports = router;