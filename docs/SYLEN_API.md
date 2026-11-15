# Sylen API contract

All Sylen-to-Wake requests must use HTTPS and send:

`Authorization: Bearer <SYLEN_API_SECRET>`

The secret is server-side only. Configure the same high-entropy value as `SYLEN_API_SECRET` in the Wake Preview environment and in Sylen's secret store. Never place it in browser code, public repositories, Discord messages, or client-side environment variables.

## POST /api/bot/cases

Creates a metadata-only moderation case. Required fields:

- `externalCaseId`: stable Sylen-generated idempotency key (1-100 chars)
- `guildId`, `channelId`, `messageId`, `authorId`: Discord snowflakes
- `mediaType`: uppercase identifier such as `IMAGE`
- `occurredAt`: optional ISO date string
- `attachmentCount`: optional integer 1-20
- `category`: optional `SEXUAL_CONTENT | VIOLENCE | GORE | OTHER | UNKNOWN`
- `severity`: optional `LOW | MEDIUM | HIGH | CRITICAL | UNKNOWN`
- `confidence`: optional number 0-1
- `status`: optional `UNCLASSIFIED | PENDING | RESTRICTED`
- `restricted`: optional boolean
- `safeSummary`: optional plain text, max 500 characters, only when not restricted

The endpoint rejects image/media fields, binary/base64 content, and URL values. Restricted cases are stored without classifier confidence, classifier labels, or summaries. Repeated `externalCaseId` values are idempotent.

## POST /api/bot/cases/events

Accepts `{ "externalCaseId": "...", "eventType": "MESSAGE_DELETED" }` to record source-message deletion, or `DECISION_DELIVERED` to acknowledge delivery of a human-reviewed decision.

## GET /api/bot/decisions

Returns up to 50 undelivered, human-reviewed `CONFIRMED` or `DISMISSED` decisions. Restricted cases are never returned. Sylen should acknowledge each delivered decision through the events endpoint.

## Human reviewer APIs

- `GET /api/cases/:id`: authenticated metadata-only case detail.
- `POST /api/cases/:id/review`: ADMIN or OWNER decision; body `{ "decision": "CONFIRMED" | "DISMISSED", "note": "..." }`.
- `GET /api/guilds`: authenticated list of configured guilds.
- `GET /api/guilds/:id/config`: authenticated guild configuration.
- `PUT /api/guilds/:id/config`: ADMIN or OWNER update.
- `GET /api/audit`: OWNER-only audit history.

The classifier is advisory only. No API in this contract issues Discord punishments. Restricted cases cannot be reviewed through the normal decision endpoint. No endpoint accepts or serves raw media, media previews, or attachment CDN URLs.
