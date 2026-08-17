const express = require('express');
const path = require('path');
const fs = require('fs');
const { requireUser } = require('../middleware/auth');
const updateService = require('../services/updateService');
const featureData = require('../../config/features');

const router = express.Router();
const downloadDir = path.join(__dirname, '../../../download');

router.get('/', async (req, res, next) => {
  try {
    const latestUpdates = await updateService.listPublished();
    res.render('home/index', {
      title: 'Kitty',
      latestUpdates: latestUpdates.slice(0, 3),
      loggedOut: req.query.logout === '1',
    });
  } catch (err) {
    next(err);
  }
});

router.get('/features', (req, res) => {
  res.render('features/index', { title: 'Features · Kitty', features: featureData });
});

router.get('/updates', async (req, res, next) => {
  try {
    const updates = await updateService.listPublished();
    res.render('updates/index', { title: 'Live Updates · Kitty', updates });
  } catch (err) {
    next(err);
  }
});

router.get('/updates/:id', async (req, res, next) => {
  try {
    const update = await updateService.getById(req.params.id, { publicOnly: true });
    if (!update) {
      return res.status(404).render('errors/404', { title: 'Update Not Found' });
    }
    res.render('updates/details', { title: `${update.title} · Kitty`, update });
  } catch (err) {
    next(err);
  }
});

router.get('/account', requireUser, (req, res) => {
  res.render('account/index', {
    title: 'Your Account · Kitty',
    user: res.locals.user,
    welcome: req.query.welcome === '1',
  });
});

// Serves the zip from /download as an instant file download (logged-in users only).
router.get('/download', requireUser, (req, res, next) => {
  try {
    const files = fs.existsSync(downloadDir)
      ? fs.readdirSync(downloadDir).filter((f) => f.toLowerCase().endsWith('.zip'))
      : [];
    if (files.length === 0) {
      return res.status(404).render('errors/404', { title: 'Download Not Found' });
    }
    // If multiple zips exist, use the most recently modified one.
    const target = files
      .map((f) => ({ f, mtime: fs.statSync(path.join(downloadDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)[0].f;
    res.download(path.join(downloadDir, target));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
