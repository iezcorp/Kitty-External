const prisma = require('../../database/prisma');
const { buildAvatarUrl } = require('../../discord/discordService');

/**
 * Finds an existing Kitty account for this Discord user, or creates a new
 * one. Always refreshes profile fields (username/avatar can change on
 * Discord's side) and bumps lastLoginAt. This is the single place new
 * accounts get created, guaranteeing no duplicate account per Discord ID
 * thanks to the unique constraint on discordId.
 */
async function findOrCreateUserFromDiscord(discordUser) {
  const displayName = discordUser.global_name || discordUser.username;
  const avatar = buildAvatarUrl(discordUser);

  const user = await prisma.user.upsert({
    where: { discordId: discordUser.id },
    update: {
      username: discordUser.username,
      discriminator: discordUser.discriminator || null,
      displayName,
      avatar,
      verified: true,
      lastLoginAt: new Date(),
    },
    create: {
      discordId: discordUser.id,
      username: discordUser.username,
      discriminator: discordUser.discriminator || null,
      displayName,
      avatar,
      verified: true,
    },
  });

  return user;
}

module.exports = { findOrCreateUserFromDiscord };
