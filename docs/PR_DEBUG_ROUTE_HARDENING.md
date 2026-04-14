## Summary
This PR hardens debug and diagnostic API routes to be safe-by-default in production while preserving local/dev troubleshooting workflows.

## Changes
- Add shared debug-access guard in `src/lib/debugAccess.ts`.
- Harden `GET /api/debug-session`:
  - production blocked by default
  - requires `ENABLE_DEBUG_ROUTES=true` and `Authorization: Bearer <ADMIN_SECRET>`
  - response sanitized (no PII, no token/session details, no secret prefixes)
- Remove `POST /api/debug-session` test session creation path.
- Harden `GET /api/check-env` with same guard and sanitized payload.
- Reduce `GET /api/session-check` payload to only `isLoggedIn`.
- Add integration tests for production access policy and sanitized payload behavior.

## Security Rationale
- Prevent unauthenticated operational data disclosure.
- Eliminate session-minting debug path risk.
- Minimize user identity exposure from public diagnostic endpoints.

## Behavior Changes
- `GET /api/session-check` no longer returns `userEmail` and `userId`.
- Debug routes return `404` in production by default.

## Environment Variables
- `ADMIN_SECRET`: required for authorized debug/admin calls.
- `ENABLE_DEBUG_ROUTES`: keep `false` in production/preview unless temporary approved troubleshooting is needed.

## Validation
- `yarn typecheck` passes.
- `yarn test` passes.
- New tests verify:
  - production default block for debug routes
  - production allow only with debug flag + valid admin secret
  - response sanitization
