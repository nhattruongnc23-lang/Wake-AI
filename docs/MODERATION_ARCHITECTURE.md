# Wake Moderation

Wake Moderation is the moderation dashboard and API service that works with the Koro Discord bot.

## Services
- Dashboard (Next.js): case queue, case details, review decisions, guild configuration, user access and audit history.
- Authentication: Google OAuth through Auth.js. Google verifies identity; Wake Moderation applies its own account allowlist and database-backed roles.
- API: authenticated endpoints for Koro ingestion and reviewer actions.
- Database: PostgreSQL via Prisma. Stores case metadata, guild configuration, reviewer decisions and audit events.
- Analyzer: a separate media-classification service. It returns labels and confidence; it does not decide punishments.

## Trust boundaries
1. Google OAuth is for human dashboard accounts only.
2. Koro uses a separate server-to-server credential. Never reuse a Google session or expose the bot credential to the browser.
3. Every API request validates authorization and input. Use rate limits and request-size limits at the edge.
4. The dashboard is private; it is not a public media host.
5. Do not persist raw sensitive media, attachment CDN URLs, or media copies in case records. Store minimal metadata and classifier results.
6. Suspected sexual content involving minors, or content where age is unclear, must never be displayed, downloaded, forwarded, or given a reveal control. Route only minimal metadata through the restricted safety workflow and follow platform reporting requirements.
7. Classifier output is advisory. Human reviewers make decisions; no automatic punishment is issued by the classifier.
8. Every review decision and privileged configuration change creates an audit record.

## Roles
- OWNER: full control, account and guild administration.
- ADMIN: review cases and manage explicitly granted guild settings.
- VIEWER: read-only access to permitted case metadata.

The initial sign-in gate is WAKE_ALLOWED_EMAILS. Keep it restrictive. User roles are stored in PostgreSQL and must be assigned by an owner.

## Case lifecycle
PENDING → CONFIRMED or DISMISSED.

A case contains Discord IDs, timestamps, media type, classifier category/severity/confidence, safe text metadata where necessary, and review history. It must not contain raw media bytes or a publicly accessible media URL.

## Planned API boundaries
- POST /api/bot/cases: Koro-only ingestion endpoint, authenticated with a dedicated bot secret or signed request.
- GET /api/cases: authenticated dashboard case listing.
- GET /api/cases/:id: authorized case metadata.
- POST /api/cases/:id/review: owner/admin review action with audit logging.
- GET/PUT /api/guilds/:id/config: authorized guild configuration.

## Environment
See .env.example. Production requires HTTPS, a strong Auth.js secret, Google OAuth credentials, a PostgreSQL connection, an allowlist and a separate Koro API secret.
