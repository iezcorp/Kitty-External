const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const config = require('../config');
const { loadUser } = require('./middleware/auth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const createSessionStore = require('./services/sessionStore');

const pagesRouter = require('./routes/pages');
const authRouter = require('./routes/auth');
const adminAuthRouter = require('./routes/adminAuth');
const adminRouter = require('./routes/admin');
const apiRouter = require('./routes/api');

const app = express();

// Minimal logger shared across middleware (swap for pino/winston in real deployments).
const logger = {
  info: (...args) => console.log('[info]', ...args),
  warn: (...args) => console.warn('[warn]', ...args),
  error: (...args) => console.error('[error]', ...args),
};
app.set('logger', logger);

// trust proxy is required for correct secure cookies / rate-limit IPs behind
// Vercel's edge proxy as well as any other reverse proxy.
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../../views'));

// --- Security headers ---
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://cdn.discordapp.com'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(morgan(config.isProd ? 'combined' : 'dev'));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
// On Vercel, static assets in public/ are served by the CDN directly and this
// middleware is a no-op there; locally it serves the same files.
app.use(express.static(path.join(__dirname, '../../public')));

// --- Sessions ---
// Stores sessions in the production database (Postgres) when DATABASE_URL is a
// Postgres connection string, otherwise falls back to SQLite for local dev.
app.use(
  session({
    store: createSessionStore(),
    name: 'kitty.sid',
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProd,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

app.use(loadUser);

// --- Routes ---
app.use('/', pagesRouter);
app.use('/auth', authRouter);
// adminAuthRouter exposes /admin/login (GET+POST) and /admin/logout (POST),
// and must be mounted before adminRouter so unauthenticated users can reach
// the login page itself (adminRouter guards everything under /admin).
app.use('/admin', adminAuthRouter);
app.use('/admin', adminRouter);
app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;