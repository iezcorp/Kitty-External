const express = require('express');
const { requireUser } = require('../middleware/auth');
const updateService = require('../services/updateService');
const downloadService = require('../services/downloadService');
const featureData = require('../../config/features');

const router = express.Router();

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

// Serves the newest uploaded zip as an instant file download (logged-in users only).
router.get('/download', requireUser, async (req, res, next) => {
  try {
    const file = await downloadService.currentFile();
    if (!file) {
      return res.status(404).render('errors/404', { title: 'Download Not Found' });
    }
    res.attachment(file.name);
    res.send(file.data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
