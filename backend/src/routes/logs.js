const express = require('express');
const { Op } = require('sequelize');
const { AlteracaoArvore, AlteracaoPergunta, Administrador } = require('../models');
const auth = require('../middlewares/auth');

const router = express.Router();

/**
 * GET /api/logs?limit=50
 * Retorna feed mesclado de alterações de árvores e perguntas, mais nome do admin.
 */
router.get('/', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);

    const [la, lp] = await Promise.all([
      AlteracaoArvore.findAll({ order: [['data_alteracao', 'DESC']], limit }),
      AlteracaoPergunta.findAll({ order: [['data_alteracao', 'DESC']], limit }),
    ]);

    // junta e ordena por data
    const merged = [
      ...la.map(r => ({
        tipo: 'arvore',
        trilha_nome: r.trilha_nome,
        arvore_codigo: r.arvore_codigo,
        pergunta_id: null,
        admin_email: r.admin_email,
        data_alteracao: r.data_alteracao
      })),
      ...lp.map(r => ({
        tipo: 'pergunta',
        trilha_nome: r.trilha_nome,
        arvore_codigo: r.arvore_codigo,
        pergunta_id: r.pergunta_id,
        admin_email: r.admin_email,
        data_alteracao: r.data_alteracao
      })),
    ].sort((a,b) => new Date(b.data_alteracao) - new Date(a.data_alteracao))
     .slice(0, limit);

    // busca nomes dos admins envolvidos
    const emails = [...new Set(merged.map(i => i.admin_email))];
    const admins = await Administrador.findAll({
      where: { email: { [Op.in]: emails } },
      attributes: ['email', 'nome']
    });
    const nameByMail = Object.fromEntries(admins.map(a => [a.email, a.nome]));

    const payload = merged.map(i => ({
      data: i.data_alteracao,
      nome: nameByMail[i.admin_email] || i.admin_email,
      atividade: i.tipo === 'arvore'
        ? `Alterou a árvore ${i.arvore_codigo} da trilha “${i.trilha_nome}”.`
        : `Alterou a pergunta #${i.pergunta_id} (árvore ${i.arvore_codigo}) da trilha “${i.trilha_nome}”.`
    }));

    res.json({ items: payload });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Falha ao listar logs' });
  }
});

module.exports = router;
