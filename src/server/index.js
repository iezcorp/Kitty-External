const app = require('./app');
const config = require('../config');

// Local development entry point. Vercel uses api/index.js instead, which
// imports the same app without starting a persistent listener.
app.listen(config.port, () => {
  app.get('logger').info(`Kitty is running at ${config.baseUrl} (port ${config.port})`);
});