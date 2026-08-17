const express = require('express');
const crypto = require('crypto');
const discord = require('../../discord/discordService');
const { findOrCreateUserFromDiscord } = require('../services/userService');
const { authLimiter } = require('../middleware/rateLimit');
const config = require('../../config');

const router = express.Router();

// Step 1: kick off the Discord OAuth2 flow.
router.get('/discord', authLimiter, (req, res) => {
  const state = crypto.randomBytes(24).toString('hex');
  req.session.oauthState = state;
  res.redirect(discord.getAuthorizationUrl(state));
});

// Step 2: Discord redirects back here with a code (or an error/denial).
router.get('/discord/callback', authLimiter, async (req, res, next) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).render('errors/auth-failure', {
        title: 'Discord Authorization Failed',
        message: 'You cancelled or denied the Discord authorization request.',
      });
    }

    if (!code || !state || state !== req.session.oauthState) {
      return res.status(400).render('errors/auth-failure', {
        title: 'Discord Authorization Failed',
        message: 'Your login session expired or was invalid. Please try again.',
      });
    }
    req.session.oauthState = null;

    const tokenData = await discord.exchangeCodeForToken(code);
    const discordUser = await discord.getDiscordUser(tokenData.access_token);

    // Server-side, authoritative membership check — never trust the client.
    const isMember = await discord.isGuildMember(discordUser.id);

    if (!isMember) {
      return res.status(403).render('errors/discord-required', {
        title: 'Discord Server Required',
        discordInviteUrl: config.discord.inviteUrl,
      });
    }

    const user = await findOrCreateUserFromDiscord(discordUser);

    // Regenerate the session on privilege change to prevent session fixation.
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = user.id;
      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        res.redirect('/account?welcome=1');
      });
    });
  } catch (err) {
    next(err);
  }
});

// Logout: destroys the server-side session and clears the cookie.
router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('kitty.sid');
    res.redirect('/?logout=1');
  });
});

module.exports = router;
