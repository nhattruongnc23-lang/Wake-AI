# Wake Moderation

Wake Moderation is the moderation dashboard and API service that works with the Sylen Discord bot.

## Services
- Dashboard (Next.js): case queue, case details, review decisions, guild configuration, user access and audit history.
- Authentication: Google OAuth through Auth.js. Google verifies identity; Wake Moderation applies its own account allowlist and database-backed roles.
- API: authenticated endpoints for Sylen ingestion and reviewer actions.
- Database: PostgreSQL via Prisma. Stores case metadata, guild configuration, reviewer decisions and audit events.
- Analyzer: a separate media-classification service. It returns labels and confidence; it does not decide punishments.
- Visual Intelligence v0.1: metadata-only analyzer result endpoint at `POST /api/analyzer/results`, authenticated with `WAKE_ANALYZER_SECRET`. It separates visual style from safety category and fails closed on uncertain results. No image bytes or media URLs are accepted.

## Trust boundaries
1. Google OAuth is for human dashboard accounts only.
2. Sylen uses a separate server-to-server credential. Never reuse a Google session or expose the bot credential to the browser.
3. Every API request validates authorization and input. Use rate limits and request-size limits at the edge.
4. The dashboard is private; it is not a public media host.
5. Do not persist raw sensitive media, attachment CDN URLs, or media copies in case records. Store minimal metadata and classifier results.
6. Suspected sexual content involving minors, or content where age is unclear in a sexual context, must never be displayed, downloaded, forwarded, or given a reveal control. This restriction applies to every role, including OWNER. If uncertain, fail closed and route only minimal metadata through the restricted safety workflow.
7. Classifier output is advisory. Human reviewers make decisions; no automatic punishment is issued by the classifier.
8. Every review decision, evidence access attempt and privileged configuration change creates an audit record.
9. Media evidence access is not implemented yet. Do not send or render media until the complete safety gate, authorization, audit and expiry controls are implemented.

## Roles
- OWNER: full system control; can inspect media explicitly cleared for human review, reveal blurred eligible previews, make final review decisions, manage users and global settings, and view full audit history.
- ADMIN: can inspect media explicitly cleared for human review, reveal blurred eligible previews and make review decisions within the assigned moderation scope; can view scoped audit history. Cannot manage users or global security settings.
- VIEWER: read-only access to case metadata and classifier results. Cannot view media evidence, reveal previews or make review decisions.

No role can override the mandatory restricted-media safety gate. The full role matrix and media handling requirements are defined in [docs/MEDIA_REVIEW_POLICY.md](./MEDIA_REVIEW_POLICY.md).

The initial sign-in gate is WAKE_ALLOWED_EMAILS. Keep it restrictive. User roles are stored in PostgreSQL and must be assigned by an owner.

## Case lifecycle
UNCLASSIFIED → PENDING → CONFIRMED or DISMISSED. Restricted cases are held outside the normal review queue.

A case contains Discord IDs, timestamps, media type, classifier category/severity/confidence, safe text metadata where necessary, and review history. It must not contain raw media bytes or a publicly accessible media URL.

## Planned API boundaries
- POST /api/bot/cases: Sylen-only metadata ingestion endpoint, authenticated with a dedicated bot secret.
- POST /api/bot/cases/events: Sylen-only source-message lifecycle events and reviewed-decision delivery acknowledgements.
- GET /api/bot/decisions: Sylen-only polling endpoint for human-reviewed decisions not yet delivered to Discord.
- GET /api/cases: authenticated dashboard case listing.
- GET /api/cases/:id: authorized case metadata.
- POST /api/cases/:id/review: owner/admin review action with audit logging.
- GET/PUT /api/guilds/:id/config: authorized guild configuration.

## Environment
See .env.example. Production requires HTTPS, a strong Auth.js secret, Google OAuth credentials, a PostgreSQL connection, an allowlist and a separate Sylen API secret.
