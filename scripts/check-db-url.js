// Pre-build guard for Vercel: verifies DATABASE_URL is a real PostgreSQL
// connection string before Prisma migrations run. Fails fast with a clear
// message instead of a cryptic P1012 schema validation error.
//
// What causes the P1012 on Vercel: the project's DATABASE_URL env var is
// still the placeholder "file:./dev.db" copied from .env.example, or the
// Postgres URL wasn't added for the right scope (Production/Preview/All).
// Prisma then validates the placeholder against the postgresql provider and
// refuses to build.

const url = process.env.DATABASE_URL || '';

const isPostgres = /^postgres(ql)?:\/\//i.test(url);

if (!isPostgres) {
  console.error('\n[check-db-url] DATABASE_URL is missing or not a PostgreSQL URL.');
  if (url) {
    console.error(`[check-db-url] Current value: "${url}"`);
  }
  console.error('\nFix it in Vercel: Project Settings -> Environment Variables:');
  console.error('  Name:     DATABASE_URL');
  console.error('  Value:    your Postgres connection string, e.g.');
  console.error('            postgresql://user:password@host:5432/db?sslmode=require');
  console.error('  Scopes:   Production, Preview, Development (or "All environments")');
  console.error('Free Postgres: https://neon.tech or https://supabase.com\n');
  process.exit(1);
}

console.log('[check-db-url] DATABASE_URL looks like a valid PostgreSQL URL.');