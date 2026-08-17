const path = require('path');
const config = require('../../config');

/**
 * Strips Prisma-specific connection params that node-postgres does not
 * understand (e.g. ?schema=public, ?pgbouncer=true), keeping standard ones
 * like sslmode.
 */
function toPgConnectionString(url) {
  const parsed = new URL(url);
  for (const key of [...parsed.searchParams.keys()]) {
    if (!['sslmode', 'ssl', 'application_name'].includes(key)) {
      parsed.searchParams.delete(key);
    }
  }
  return parsed.toString();
}

/**
 * Returns an express-session store suitable for the environment:
 *  - Postgres connection string (production/Vercel) -> Postgres-backed
 *    sessions (connect-pg-simple), sharing the same database as Prisma.
 *  - Otherwise (local dev) -> SQLite session store under data/.
 */
function createSessionStore() {
  const url = config.database.url || '';
  const isPostgres = /^postgres(ql)?:\/\//i.test(url);

  if (isPostgres) {
    const session = require('express-session');
    const { Pool } = require('pg');
    const PgStore = require('connect-pg-simple')(session);

    const pool = new Pool({ connectionString: toPgConnectionString(url), max: 10 });
    return new PgStore({ pool, createTableIfMissing: true, tableName: 'session' });
  }

  const session = require('express-session');
  const SQLiteStore = require('connect-sqlite3')(session);
  const dir = path.join(__dirname, '../../../data').replace(/\\/g, '/');
  return new SQLiteStore({ db: 'sessions.sqlite', dir });
}

module.exports = createSessionStore;