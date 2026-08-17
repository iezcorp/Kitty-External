# Kitty

A production-quality product website with Discord OAuth2 authentication,
server-verified Discord server membership, a live-updating changelog, and a
secured admin dashboard for publishing updates.

Built with Node.js, Express, EJS, SQLite (via Prisma), and real
session-based authentication — no mock data, no fake login screens.

---

## Features

- **Discord OAuth2 login.** Users sign in with Discord; the backend verifies
  server membership using the Discord API before creating or logging into
  a Kitty account. No Discord password is ever seen or stored.
- **Separate admin authentication.** Username + Argon2id-hashed password,
  rate-limited, with every admin route protected server-side regardless of
  how the URL is reached.
- **Live Updates with real-time push.** Admin-published updates appear on
  the Live Updates page instantly for anyone with the page open, via
  Server-Sent Events — no polling, no refresh needed.
- **Real persistence.** SQLite database via Prisma; users and updates
  survive a server restart.
- **Security-first defaults.** Helmet security headers, HTTP-only/SameSite
  session cookies, rate limiting, input validation, parameterized queries
  via Prisma, audit logging for admin actions.

---

## 1. Prerequisites

- Node.js 18+
- A Discord application with a bot (create one at
  https://discord.com/developers/applications)

## 2. Install

```bash
cd kitty
npm install
```

## 3. Configure environment variables

```bash
cp .env.example .env
```

Then edit `.env`:

| Variable | Where to get it |
|---|---|
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Discord Developer Portal → your app → OAuth2 |
| `DISCORD_REDIRECT_URI` | Must exactly match a redirect URL registered in the OAuth2 tab, e.g. `http://localhost:3000/auth/discord/callback` |
| `DISCORD_BOT_TOKEN` | Discord Developer Portal → your app → Bot → Reset/Copy Token |
| `DISCORD_GUILD_ID` | Right-click your Discord server (with Developer Mode on) → Copy Server ID |
| `DISCORD_INVITE_URL` | An invite link to your Discord server |
| `SESSION_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |

**Important:** invite your bot to the target server with the
`Server Members Intent` enabled (Developer Portal → Bot → Privileged
Gateway Intents) and at minimum the permission to view server members, or
membership verification will fail.

### Generate the admin password hash

Never put a plaintext password in `.env`. Generate an Argon2id hash instead:

```bash
npm run hash:admin -- "your-strong-password"
```

Copy the printed `ADMIN_PASSWORD_HASH=...` line into your `.env`.
`ADMIN_USERNAME` defaults to `Iez`.

## 4. Set up the database

```bash
npx prisma migrate dev --name init
```

This creates `prisma/dev.db` (SQLite) and generates the Prisma client.
To use Postgres instead, change the `provider` in `prisma/schema.prisma`
to `postgresql` and point `DATABASE_URL` at your Postgres instance.

## 5. Run it

```bash
npm run dev     # with auto-reload (nodemon)
# or
npm start        # plain node
```

Visit `http://localhost:3000`.

---

## Project structure

```
kitty/
├── src/
│   ├── server/
│   │   ├── index.js         # app entry point, middleware wiring
│   │   ├── routes/          # pages, auth, adminAuth, admin, api
│   │   ├── middleware/      # auth, rate limiting, error handling
│   │   └── services/        # adminAuth, user, update, SSE
│   ├── discord/              # Discord OAuth2 + guild membership service
│   ├── database/             # Prisma client singleton
│   └── config/                # env loader + placeholder feature list
├── public/                    # css, client JS, images
├── views/                     # EJS templates (home, features, updates, auth, account, admin)
├── prisma/schema.prisma       # User, Update, AdminLoginAttempt, AuditLog models
├── scripts/hash-admin-password.js
└── .env.example
```

## Editing placeholder features

`src/config/features.js` holds the Features page content — edit or extend
the array there; the page and its icons update automatically.

## Testing checklist

This mirrors the acceptance criteria the project was built against:

- [ ] New Discord user login creates an account
- [ ] Existing Discord user login reuses the same account
- [ ] User not in the Discord server is blocked with a clear message
- [ ] Logout destroys the session; protected pages become inaccessible
- [ ] Returning after logout re-authenticates into the same account
- [ ] Admin login works with the correct password
- [ ] Incorrect admin password is rejected
- [ ] Repeated failed admin logins get rate-limited
- [ ] Admin logout destroys the admin session
- [ ] Creating, editing, publishing, unpublishing, deleting an update all work
- [ ] A published update appears instantly on Live Updates for connected clients (SSE)
- [ ] Data persists after restarting the server
- [ ] Mobile and desktop layouts both work correctly
- [ ] `/admin` is rejected without a valid admin session
- [ ] Unknown routes show a proper 404 page

## Deploying

Set `NODE_ENV=production`, provide real secrets via your host's environment
variable configuration (never commit `.env`), and run `npm run prisma:deploy`
before `npm start`. Put the app behind HTTPS — the session cookie's `secure`
flag is automatically enabled in production and requires it.
