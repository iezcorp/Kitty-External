const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { requireAdmin } = require('../middleware/auth');
const updateService = require('../services/updateService');
const downloadService = require('../services/downloadService');
const config = require('../../config');
const prisma = require('../../database/prisma');

const router = express.Router();

// Every route below requires a valid admin session. This is enforced
// server-side regardless of how the URL was reached.
router.use(requireAdmin);

// Zip uploads are held in memory and stored in the database (works locally
// on SQLite and in production on Postgres — no writable disk needed).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.download.maxBytes },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname || '').toLowerCase() === '.zip') cb(null, true);
    else cb(new Error('Only .zip files are allowed.'));
  },
});

router.get('/', async (req, res, next) => {
  try {
    const [totalUsers, totalUpdates, latestUpdate, recentUsers, recentUpdates] = await Promise.all([
      prisma.user.count(),
      prisma.update.count(),
      prisma.update.findFirst({ where: { published: true }, orderBy: { publishedAt: 'desc' } }),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.update.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard · Kitty',
      welcome: req.query.welcome === '1',
      adminUsername: req.session.adminUsername,
      stats: { totalUsers, totalUpdates, latestUpdate },
      recentUsers,
      recentUpdates,
    });
  } catch (err) {
    next(err);
  }
});

// --- Updates Manager ---

router.get('/updates', async (req, res, next) => {
  try {
    const updates = await updateService.listAll();
    res.render('admin/updates/index', { title: 'Manage Updates · Kitty', updates });
  } catch (err) {
    next(err);
  }
});

router.get('/updates/create', (req, res) => {
  res.render('admin/updates/form', { title: 'Create Update · Kitty', update: null, errors: [] });
});

const updateValidators = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('version').trim().notEmpty().withMessage('Version is required'),
  body('shortDescription').trim().notEmpty().withMessage('Short description is required'),
  body('description').trim().notEmpty().withMessage('Full description is required'),
];

function parseChanges(raw) {
  return (raw || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

router.post('/updates/create', updateValidators, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('admin/updates/form', {
        title: 'Create Update · Kitty',
        update: req.body,
        errors: errors.array(),
      });
    }

    const created = await updateService.create({
      title: req.body.title,
      version: req.body.version,
      robloxVersion: req.body.robloxVersion,
      shortDescription: req.body.shortDescription,
      description: req.body.description,
      changes: parseChanges(req.body.changes),
      imageUrl: req.body.imageUrl,
    });

    await prisma.auditLog.create({
      data: { actor: `admin:${req.session.adminUsername}`, action: 'update.create', target: created.id },
    });

    res.redirect('/admin/updates?created=1');
  } catch (err) {
    next(err);
  }
});

router.get('/updates/:id/edit', async (req, res, next) => {
  try {
    const update = await updateService.getById(req.params.id);
    if (!update) return res.status(404).render('errors/404', { title: 'Update Not Found' });
    res.render('admin/updates/form', {
      title: 'Edit Update · Kitty',
      update: { ...update, changes: update.changes.join('\n') },
      errors: [],
    });
  } catch (err) {
    next(err);
  }
});

router.post('/updates/:id/edit', updateValidators, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('admin/updates/form', {
        title: 'Edit Update · Kitty',
        update: { ...req.body, id: req.params.id },
        errors: errors.array(),
      });
    }

    const updated = await updateService.update(req.params.id, {
      title: req.body.title,
      version: req.body.version,
      robloxVersion: req.body.robloxVersion,
      shortDescription: req.body.shortDescription,
      description: req.body.description,
      changes: parseChanges(req.body.changes),
      imageUrl: req.body.imageUrl,
    });

    if (!updated) return res.status(404).render('errors/404', { title: 'Update Not Found' });

    await prisma.auditLog.create({
      data: { actor: `admin:${req.session.adminUsername}`, action: 'update.edit', target: updated.id },
    });

    res.redirect('/admin/updates?edited=1');
  } catch (err) {
    next(err);
  }
});

router.post('/updates/:id/publish', async (req, res, next) => {
  try {
    const updated = await updateService.publish(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    await prisma.auditLog.create({
      data: { actor: `admin:${req.session.adminUsername}`, action: 'update.publish', target: updated.id },
    });
    res.json({ success: true, update: updated });
  } catch (err) {
    next(err);
  }
});

router.post('/updates/:id/unpublish', async (req, res, next) => {
  try {
    const updated = await updateService.unpublish(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    await prisma.auditLog.create({
      data: { actor: `admin:${req.session.adminUsername}`, action: 'update.unpublish', target: updated.id },
    });
    res.json({ success: true, update: updated });
  } catch (err) {
    next(err);
  }
});

router.post('/updates/:id/delete', async (req, res, next) => {
  try {
    const ok = await updateService.remove(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    await prisma.auditLog.create({
      data: { actor: `admin:${req.session.adminUsername}`, action: 'update.delete', target: req.params.id },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// --- Downloads Manager ---

router.get('/downloads', async (req, res, next) => {
  try {
    const files = await downloadService.listFiles();
    res.render('admin/downloads', {
      title: 'Manage Downloads · Kitty',
      files,
      current: files.length > 0 ? files[0].name : null,
      message: req.query.uploaded === '1' ? 'File uploaded. Users now download it instantly.' : null,
      error: req.query.error === '1' ? 'Upload failed. Only .zip files are allowed.' : null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/downloads/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.redirect('/admin/downloads?error=1');
    }
    downloadService.saveUploadedZip(req.file);

    await prisma.auditLog.create({
      data: { actor: `admin:${req.session.adminUsername}`, action: 'download.upload', target: req.file.originalname },
    });

    res.redirect('/admin/downloads?uploaded=1');
  } catch (err) {
    next(err);
  }
});

router.post('/downloads/:name/delete', async (req, res, next) => {
  try {
    const name = path.basename(req.params.name || '');
    if (!(await downloadService.deleteZip(name))) {
      return res.redirect('/admin/downloads?error=1');
    }

    await prisma.auditLog.create({
      data: { actor: `admin:${req.session.adminUsername}`, action: 'download.delete', target: name },
    });

    res.redirect('/admin/downloads');
  } catch (err) {
    next(err);
  }
});

// --- Users Manager ---

router.get('/users', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    res.render('admin/users/index', { title: 'Manage Users · Kitty', users });
  } catch (err) {
    next(err);
  }
});

router.post('/users/:id/disable', async (req, res, next) => {
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { disabled: true } });
    await prisma.auditLog.create({
      data: { actor: `admin:${req.session.adminUsername}`, action: 'user.disable', target: user.id },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/users/:id/enable', async (req, res, next) => {
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { disabled: false } });
    await prisma.auditLog.create({
      data: { actor: `admin:${req.session.adminUsername}`, action: 'user.enable', target: user.id },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/users/:id/delete', async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({
      data: { actor: `admin:${req.session.adminUsername}`, action: 'user.delete', target: req.params.id },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
