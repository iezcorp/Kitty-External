const fetch = require('node-fetch');
const config = require('../config');

const DISCORD_API = 'https://discord.com/api/v10';

/**
 * Build the URL that sends the user to Discord's OAuth2 consent screen.
 * `state` should be a random, per-session value to protect against CSRF
 * on the OAuth redirect (verified in the callback route).
 */
function getAuthorizationUrl(state) {
  const params = new URLSearchParams({
    client_id: config.discord.clientId,
    redirect_uri: config.discord.redirectUri,
    response_type: 'code',
    scope: 'identify guilds.members.read',
    state,
    prompt: 'consent',
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange an OAuth2 "code" for an access token.
 */
async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    client_id: config.discord.clientId,
    client_secret: config.discord.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.discord.redirectUri,
  });

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord token exchange failed (${res.status}): ${text}`);
  }

  return res.json(); // { access_token, token_type, expires_in, refresh_token, scope }
}

/**
 * Fetch the authenticated Discord user's basic profile using their access token.
 */
async function getDiscordUser(accessToken) {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Discord user (${res.status})`);
  }

  return res.json(); // { id, username, discriminator, global_name, avatar, ... }
}

/**
 * Verify server-side (never trusting the client) whether the given Discord
 * user is currently a member of the required guild.
 *
 * We use the bot token against the guild member endpoint, which is the most
 * reliable server-authoritative way to check membership and does not depend
 * on the user's OAuth token/scopes remaining valid.
 */
async function isGuildMember(discordUserId) {
  const res = await fetch(`${DISCORD_API}/guilds/${config.discord.guildId}/members/${discordUserId}`, {
    headers: { Authorization: `Bot ${config.discord.botToken}` },
  });

  if (res.status === 404) {
    return false; // Not a member
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Guild membership check failed (${res.status}): ${text}`);
  }

  return true;
}

/**
 * Build a full CDN avatar URL from a Discord user's avatar hash, falling
 * back to Discord's default embedded avatar if the user has none set.
 */
function buildAvatarUrl(discordUser) {
  if (discordUser.avatar) {
    const ext = discordUser.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${ext}?size=128`;
  }
  // Default avatar index depends on whether the account uses the new username system.
  const index = discordUser.discriminator && discordUser.discriminator !== '0'
    ? Number(discordUser.discriminator) % 5
    : Number(BigInt(discordUser.id) >> 22n) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

module.exports = {
  getAuthorizationUrl,
  exchangeCodeForToken,
  getDiscordUser,
  isGuildMember,
  buildAvatarUrl,
};
