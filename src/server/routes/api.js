const express = require('express');
const updateService = require('../services/updateService');
const sse = require('../services/sseService');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.use(apiLimiter);

router.get('/updates', async (req, res, next) => {
  try {
    const updates = await updateService.listPublished();
    res.json({ updates });
  } catch (err) {
    next(err);
  }
});

router.get('/updates/:id', async (req, res, next) => {
  try {
    const update = await updateService.getById(req.params.id, { publicOnly: true });
    if (!update) return res.status(404).json({ error: 'Not found' });
    res.json({ update });
  } catch (err) {
    next(err);
  }
});

// Server-Sent Events stream: browsers on the Live Updates page keep this
// connection open and receive a push the instant an update is published,
// edited, unpublished, or deleted — no polling required.
router.get('/updates/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 5000\n\n');

  sse.addClient(res);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sse.removeClient(res);
  });
});

module.exports = router;
