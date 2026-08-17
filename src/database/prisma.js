const { PrismaClient } = require('@prisma/client');

// A single shared Prisma client instance for the whole app.
// Prevents exhausting DB connections via repeated instantiation, especially
// important with SQLite and during development with hot-reload.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['warn', 'error'],
});

module.exports = prisma;
