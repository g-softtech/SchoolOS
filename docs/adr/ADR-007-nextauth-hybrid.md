# ADR-007: Why NextAuth Hybrid

## Status
Accepted

## Context
Handling OAuth (Google, Microsoft) manually in NestJS is tedious and often leads to brittle front-end redirects. However, relying purely on NextAuth makes the NestJS API gateway insecure, as it cannot validate sessions on its own without calling the database.

## Decision
We will use a Hybrid approach. NextAuth handles the OAuth handshakes and initial session generation on the frontend. It will then pass a signed JWT to the NestJS API Gateway. The API Gateway will independently verify the JWT signature using a shared secret or public key, maintaining a stateless, highly secure backend.

## Consequences
- **Positive:** Out-of-the-box OAuth providers via NextAuth, while maintaining a strict, secure, stateless API gateway.
- **Negative:** Requires careful syncing of JWT secrets and expiration times between Next.js and NestJS.
