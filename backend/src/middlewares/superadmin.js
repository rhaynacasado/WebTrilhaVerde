const { Administrador } = require('../models');

module.exports = async function superadmin(req, res, next) {
  try {
    const admin = await Administrador.findByPk(req.user.email, {
      attributes: ['email', 'tipo'],
    });

    if (!admin) return res.status(401).json({ error: 'Administrador não encontrado' });
    if (admin.tipo !== 'superadmin') {
      return res.status(403).json({ error: 'Acesso restrito a superadministradores' });
    }

    req.admin = admin;
    return next();
  } catch (error) {
    console.error('Falha ao verificar nível de administrador:', error);
    return res.status(500).json({ error: 'Não foi possível verificar as permissões' });
  }
};
