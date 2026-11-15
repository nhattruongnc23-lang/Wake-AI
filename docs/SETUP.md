# Initial setup checklist

## Google OAuth
- Create an OAuth 2.0 Client ID with application type Web application.
- Add the local redirect URI: http://localhost:3000/api/auth/callback/google
- Add the deployed redirect URI: https://YOUR_DOMAIN/api/auth/callback/google
- Configure the OAuth consent screen and only allow intended test/production users.
- Store client ID and secret in server-side environment variables only.

## Required environment
- AUTH_GOOGLE_ID
- AUTH_GOOGLE_SECRET
- AUTH_SECRET
- AUTH_URL
- WAKE_ALLOWED_EMAILS
- WAKE_OWNER_EMAIL
- DATABASE_URL
- KORO_API_SECRET

Generate AUTH_SECRET with a cryptographically secure random generator. Use a separate random value for KORO_API_SECRET. Never put either value in NEXT_PUBLIC_* variables.

## Database
Run:
1. npm install
2. npm run db:push
3. npm run dev

For production, use managed PostgreSQL, backups, TLS and a reviewed migration workflow. Do not use a local SQLite file or in-memory state for production sessions or moderation cases.

## First owner
Set WAKE_OWNER_EMAIL to the exact verified Google email and include it in WAKE_ALLOWED_EMAILS. The first time that account is created, the Auth.js create-user event assigns OWNER. Existing accounts need an explicit role update by an authorized operator.

## Koro connection
Configure Koro with the deployed Wake Moderation API base URL and the same KORO_API_SECRET. Send only validated metadata to POST /api/bot/cases over HTTPS. Do not send attachment bytes, media URLs, or sensitive content to the dashboard.
