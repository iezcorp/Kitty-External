# Kitty

A production-quality product website with Discord OAuth2 authentication,
server-verified Discord server membership, a live-updating changelog, and a
secured admin dashboard for publishing updates and managing downloads.

Built with Node.js, Express, EJS, Prisma (SQLite locally, PostgreSQL in
production), and real session-based authentication — no mock data, no fake
login screens.

---

## Features

- **Discord OAuth2 login.** Users sign in with Discord; the backend verifies
  server membership using the Discord API before creating or logging into
  a Kitty account. No Discord password is ever seen or stored.
- **Owner access by Discord username.** Accounts listed in
  `ADMIN_OWNER_USERNAMES` (default `bloomsaltluvsyou`) are automatically
  granted admin access on login — no password login page.
- **Downloads manager.** Admins upload zip builds and remove old ones from
  the admin panel; logged-in users download the newest build.
- **Live Updates with real-time push.** Admin-published updates appear on
  the Live Updates page instantly for anyone with the page open, via
  Server-Sent Events — no polling, no refresh needed.
- **Real persistence.** Prisma database (SQLite for local dev, PostgreSQL on
  Vercel); users, updates, sessions, and downloads survive restarts.
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

## 4. Set up the database

```bash
npx prisma migrate dev --name init
```

This creates `prisma/dev.db` (SQLite) and generates the Prisma client.
Production uses PostgreSQL via `prisma/prod/schema.prisma` (see Deploying).

## 5. Run it

```bash
npm run dev     # with auto-reload (nodemon)
# or
npm start        # plain node
```

Visit `http://localhost:3000`. Log in with an `ADMIN_OWNER_USERNAMES`
account to access `/admin`.

---

## Project structure

```
kitty/
├── src/
│   ├── server/
│   │   ├── app.js            # Express app creation (exported for Vercel)
│   │   ├── index.js          # local entry point (starts the listener)
│   │   ├── routes/           # pages, auth, adminAuth, admin, api
│   │   ├── middleware/       # auth, rate limiting, error handling
│   │   └── services/         # user, update, SSE, download, session store
│   ├── discord/              # Discord OAuth2 + guild membership service
│   ├── database/             # Prisma client singleton
│   └── config/                # env loader + feature list
├── api/index.js               # Vercel serverless entry point
├── public/                    # css, client JS, images (served by Vercel CDN)
├── views/                     # EJS templates (home, features, updates, auth, account, admin)
├── prisma/
│   ├── schema.prisma          # local dev schema (SQLite)
│   └── prod/                  # production schema + migrations (PostgreSQL)
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
- [ ] An `ADMIN_OWNER_USERNAMES` account gets the Admin Dashboard nav link
- [ ] `/admin` is rejected without a valid owner session
- [ ] Admin logout destroys the admin session
- [ ] Creating, editing, publishing, unpublishing, deleting an update all work
- [ ] Uploading a zip makes it the live download; removing it unlists it
- [ ] A published update appears instantly on Live Updates for connected clients (SSE)
- [ ] Data persists after restarting the server
- [ ] Mobile and desktop layouts both work correctly
- [ ] Unknown routes show a proper 404 page

## Deploying (Vercel)

The project is structured for Vercel's Express support:

- `api/index.js` exports the Express app (official Vercel pattern).
- `vercel.json` rewrites all requests to `/api` and runs the PostgreSQL
  schema's migrations + client generation at build time.
- Sessions and uploaded downloads are stored in the database — Vercel's
  filesystem is ephemeral, so production must use PostgreSQL.
- Static assets in `public/` are served by Vercel's CDN.

Steps:

1. Create a free PostgreSQL database (e.g. [Neon](https://neon.tech) or
   [Supabase](https://supabase.com)) and copy its connection string.
2. Push the repo to GitHub, then import it at vercel.com (New Project →
   Import Git Repository).
3. Set these Environment Variables in the Vercel project:
   `DATABASE_URL` (Postgres URL), `SESSION_SECRET`, `DISCORD_CLIENT_ID`,
   `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`
   (`https://<your-app>.vercel.app/auth/discord/callback`),
   `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `BASE_URL`,
   `ADMIN_OWNER_USERNAMES`.
4. In the Discord Developer Portal, add the same
   `.../auth/discord/callback` URL to OAuth2 → Redirects.
5. Deploy. The build runs the production migrations automatically; push
   to GitHub to redeploy from then on.

Note: Vercel's free tier caps serverless request bodies around 4.5MB, so
zip uploads larger than that require a paid plan or external storage.
