const prisma = require('../../database/prisma');
const { admin } = require('../../config');

/**
 * Normalizes a Discord username for owner checks: case-insensitive and
 * tolerates an accidental leading "@".
 */
function isOwnerUsername(username) {
  if (!username) return false;
  const normalized = String(username).trim().replace(/^@/, '').toLowerCase();
  return admin.ownerUsernames.includes(normalized);
}

/**
 * Populates res.locals.user for every request if the session has a logged-in user.
 * This lets every view render user-aware nav (Login vs Account) without repeating logic.
 *
 * Owner access is granted automatically for users whose Discord username matches
 * config.admin.ownerUsernames — no password login involved.
 */
async function loadUser(req, res, next) {
  res.locals.user = null;
  res.locals.isAdmin = Boolean(req.session && req.session.isAdmin);

  try {
    if (req.session && req.session.userId) {
      const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
      if (user && !user.disabled) {
        res.locals.user = user;

        const owner = isOwnerUsername(user.username);
        if (owner && !req.session.isAdmin) {
          req.session.isAdmin = true;
          req.session.adminUsername = user.username;
          req.session.save((err) => {
            if (err) req.app.get('logger')?.error?.('failed to grant admin session', err);
          });
        } else if (!owner && req.session.isAdmin) {
          // Revoke admin if the account no longer matches an owner username.
          req.session.isAdmin = false;
          req.session.adminUsername = null;
          req.session.save((err) => {
            if (err) req.app.get('logger')?.error?.('failed to revoke admin session', err);
          });
        }
      } else {
        // Account no longer valid (deleted/disabled) — clear stale session state.
        req.session.userId = null;
      }
    }
  } catch (err) {
    // Don't block the request on a lookup failure; just proceed unauthenticated.
    req.app.get('logger')?.error?.('loadUser failed', err);
  }

  next();
}

/** Requires a logged-in Kitty (Discord-verified) user. */
function requireUser(req, res, next) {
  if (!res.locals.user) {
    return res.redirect('/auth/discord');
  }
  next();
}

/**
 * Requires a valid admin session. This is the single choke point every
 * admin route must pass through — visiting /admin directly with no valid
 * session always results in rejection, regardless of any client-side state.
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.isAdmin) {
    return res.status(403).render('errors/403', {
      title: 'Access Denied',
      message: 'You must be logged in as an administrator to view this page.',
    });
  }
  next();
}

module.exports = { loadUser, requireUser, requireAdmin };
