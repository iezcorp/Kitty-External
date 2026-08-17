require('dotenv').config();

const required = [
  'SESSION_SECRET',
  'DATABASE_URL',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_REDIRECT_URI',
  'DISCORD_BOT_TOKEN',
  'DISCORD_GUILD_ID',
];

const isProd = process.env.NODE_ENV === 'production';

// Fail fast (and loudly, but without leaking values) if critical secrets are missing.
const missing = required.filter((key) => !process.env[key] || process.env[key].startsWith('replace_') || process.env[key].startsWith('your_'));
if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.warn(
    `[config] Warning: the following environment variables are missing or still using placeholder values: ${missing.join(', ')}.\n` +
      '[config] The app will start, but any feature depending on these will not work correctly until they are set in your .env file.'
  );
}

module.exports = {
  isProd,
  port: parseInt(process.env.PORT, 10) || 3000,
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,

  session: {
    secret: process.env.SESSION_SECRET || 'insecure-dev-secret-change-me',
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  download: {
    // Maximum uploaded build size in MB (see also Vercel's function body limits).
    maxMb: parseInt(process.env.DOWNLOAD_MAX_MB, 10) || 50,
    get maxBytes() {
      return this.maxMb * 1024 * 1024;
    },
  },

  discord: {
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    redirectUri: process.env.DISCORD_REDIRECT_URI,
    botToken: process.env.DISCORD_BOT_TOKEN,
    guildId: process.env.DISCORD_GUILD_ID,
    inviteUrl: process.env.DISCORD_INVITE_URL || '#',
  },

  admin: {
    // Discord usernames (no "@") that are automatically granted owner/admin access.
    ownerUsernames: (process.env.ADMIN_OWNER_USERNAMES || 'bloomsaltluvsyou')
      .split(',')
      .map((name) => name.trim().replace(/^@/, '').toLowerCase())
      .filter(Boolean),
  },
};
