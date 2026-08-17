// Catches anything thrown/passed to next(err) further up the chain and
// renders a clean error page without leaking stack traces or internals.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const logger = req.app.get('logger');
  logger?.error?.(err.message, { stack: err.stack, path: req.path });

  const status = err.status || 500;

  if (req.path.startsWith('/api/')) {
    return res.status(status).json({
      error: status === 500 ? 'Internal server error' : err.message,
    });
  }

  res.status(status).render('errors/500', {
    title: status === 500 ? 'Server Error' : 'Error',
    message:
      status === 500
        ? 'Something went wrong on our end. Please try again shortly.'
        : err.message,
  });
}

function notFoundHandler(req, res) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(404).render('errors/404', { title: 'Page Not Found' });
}

module.exports = { errorHandler, notFoundHandler };
