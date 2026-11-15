# Wake Moderation

Private moderation dashboard and API service for the Koro Discord bot.

This branch is the new Wake Moderation workspace. The original Wake-AI branch remains unchanged.

## Stack
- Next.js App Router + React
- Google OAuth via Auth.js
- PostgreSQL + Prisma
- Separate authenticated Koro ingestion API
- Human review queue with audit events

## Current structure
- `app/login`: Google sign-in screen
- `app/page.js`: dashboard overview
- `app/cases`: moderation queue
- `app/guilds`: server configuration area
- `app/users`: owner-only account overview
- `app/api/auth/[...nextauth]`: Auth.js handlers
- `app/api/bot/cases`: Koro-to-Wake ingestion endpoint
- `app/api/cases`: authenticated case listing and review endpoint
- `prisma/schema.prisma`: users, roles, sessions, guild config, cases and audit log
- `docs/MODERATION_ARCHITECTURE.md`: security boundaries and service architecture

## Local setup
1. Use Node.js 22.12 or newer.
2. Copy `.env.example` to `.env` and fill in the required values.
3. Create a Google OAuth Web application. Add the callback URL:
   `http://localhost:3000/api/auth/callback/google`
4. Put the OAuth client ID and secret in `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
5. Add the owner email to both `WAKE_ALLOWED_EMAILS` and `WAKE_OWNER_EMAIL`.
6. Configure the Neon pooled connection in `DATABASE_URL` and the direct connection in `DIRECT_URL`. Keep both server-side only.
7. Run `npm install`, `npm run db:push`, then `npm run dev`.
8. Set a unique random `KORO_API_SECRET` of at least 32 characters. Configure the same value only in Koro's server environment.

For Neon, use the pooled connection string (with the pooler host) for `DATABASE_URL`. Use the non-pooled connection string for `DIRECT_URL`, which Prisma uses for direct database operations such as schema changes. Never commit real credentials.

The first allowed Google account matching WAKE_OWNER_EMAIL is assigned OWNER when its database account is created. Other allowlisted accounts default to VIEWER until an owner changes their role.

## Security notes
- Never commit .env or credentials.
- Google identity is not an authorization role; Wake Moderation checks its allowlist and database role.
- Koro uses a separate server credential, not a Google session.
- Case records contain metadata only. Do not add raw media, attachment URLs or public preview URLs.
- Restricted cases are excluded from the standard review action.
- Classifier results are advisory; reviewers make decisions.
- Configure HTTPS and production secrets before deployment.

## Status
Scaffold stage. The dashboard shell, Google OAuth wiring, Prisma schema, Koro ingestion endpoint and basic review API are in place. Production database setup, OAuth credentials, Koro event integration, classifier service, guild-scoped permissions, and end-to-end tests are still pending.
