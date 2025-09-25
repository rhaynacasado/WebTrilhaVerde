// backend/src/db.js
const { Sequelize } = require('sequelize');
const pg = require('pg');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectModule: pg,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: true } }, // Neon
  logging: false,
  searchPath: 'public',                 // garante schema public
  define: { freezeTableName: true },    // evita pluralização automática
});

module.exports = sequelize;
