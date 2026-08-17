// Vercel serverless entry point (official Express pattern):
// https://vercel.com/docs/frameworks/backend/express
// All incoming requests are rewritten to this function by vercel.json, and
// the exported Express app handles routing internally.
const app = require('../src/server/app');
const config = require('../src/config');

// Matches the official Vercel Express guide; harmless in the serverless
// sandbox and keeps the port-listener behavior identical to local dev.
app.listen(config.port, () => {});

module.exports = app;