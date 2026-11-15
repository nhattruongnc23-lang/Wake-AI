# Wake Moderation — Media Review & Access Policy

This policy defines who may inspect moderation evidence and which cases must remain inaccessible. It is the implementation contract for the future Media Analyzer and evidence-viewing endpoint. It does not enable media transfer or display by itself.

## Role matrix

| Capability | OWNER | ADMIN | VIEWER |
|---|---:|---:|---:|
| View case metadata and classifier results | Yes | Yes | Yes |
| View media explicitly cleared for human review | Yes | Yes, within assigned moderation scope | No |
| Reveal a blurred, review-eligible preview | Yes | Yes, within assigned moderation scope | No |
| Confirm or dismiss a review-eligible case | Yes | Yes, within assigned moderation scope | No |
| Manage users and role assignments | Yes | No | No |
| Manage global security and system settings | Yes | No | No |
| View audit history | Yes | Scoped/read-only | No |

OWNER and ADMIN access is still subject to the media safety gate. No role, including OWNER, can override a restricted-media decision.

## Mandatory media safety gate

1. The first-stage safety classifier must run before any preview is made available to a human.
2. If content is suspected to be sexual content involving a minor, or the person's age is unclear in a sexual context, mark the case RESTRICTED.
3. RESTRICTED media must not be rendered, downloaded, forwarded, copied into dashboard storage, or offered a reveal control to any account. This includes OWNER and ADMIN.
4. When the classifier is uncertain whether this restriction applies, fail closed: keep media inaccessible and route only minimal metadata through the restricted workflow.
5. Do not store raw media, attachment CDN URLs, thumbnails, or permanent preview URLs in the case database. Do not expose media URLs to browser JavaScript.
6. Restricted cases may expose only the minimum metadata needed for safe triage and platform reporting. Follow Discord's reporting procedures and applicable law.

## Human review for eligible media

- Only media that passes the first-stage safety gate may be made available for human review.
- OWNER and authorized ADMIN accounts may inspect eligible evidence. VIEWER accounts receive metadata and classifier results only.
- Previews are blurred by default. A deliberate reveal action is required for each item.
- Every evidence access and reveal attempt must be audit-logged with actor, case, timestamp, and action. Never log media bytes, signed URLs, or sensitive preview content.
- Evidence delivery must be server-authorized, short-lived, non-cacheable, and protected against direct-link sharing. Do not use public CDN URLs.
- Prefer transient processing and automatic expiry. No persistent evidence archive is part of this design.
- Human reviewers make the final decision. Classifier labels and confidence are advisory and must not trigger automatic punishment.

## Current implementation boundary

The current Sylen bridge sends metadata only. The current Wake dashboard does not display media. This document is a policy specification, not evidence-viewing functionality. Do not add media transport, storage, preview routes, or reveal controls until the safety gate, authorization checks, audit logging, expiry, and tests are implemented together.

## Required tests before enabling evidence review

- VIEWER cannot request or reveal any media.
- OWNER and ADMIN can request only cases explicitly marked eligible for human review.
- RESTRICTED cases are inaccessible to every role, including OWNER.
- Unknown, missing, or failed safety-classifier results fail closed.
- Direct requests without a valid session or with an insufficient role are denied.
- Every permitted view and reveal attempt creates an audit event.
- Responses are private/no-store and evidence URLs cannot be reused after expiry.
- No raw media, CDN URL, or preview URL is persisted in the database or application logs.
