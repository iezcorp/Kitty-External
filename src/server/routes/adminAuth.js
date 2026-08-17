const express = require('express');

const router = express.Router();

// NOTE: this router is mounted at /admin in src/server/index.js, so paths
// here resolve to /admin/login and /admin/logout.

// The password-based admin login has been removed. Owner access is granted
// automatically by Discord username in middleware/auth.js (loadUser), so
// these routes only exist to keep existing links working.

router.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin');
  }
  res.redirect('/auth/discord');
});

router.post('/login', (req, res) => {
  res.redirect('/admin');
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('kitty.sid');
    res.redirect('/');
  });
});

module.exports = router;