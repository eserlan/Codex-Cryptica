# Quickstart: LLM Session Ratelimit

## Workflow

1. **Client Initialization**: On web app load, the `AiSessionManager` mounts an invisible Cloudflare Turnstile widget.
2. **Token Fetch**: Once the widget solves, the manager POSTs the token to `oracle-proxy` at `/api/session`.
3. **Token Issuance**: `oracle-proxy` validates the Turnstile token, mints an HMAC-signed string containing an expiration (e.g. 30 minutes) and the client IP, and returns it.
4. **Queueing**: If any generation requests are made _before_ the token arrives, `AiSessionManager` queues them as Promises. Once the token arrives, they all flush to the `oracle-proxy` with the `Authorization: Bearer <token>` header.
5. **Generation & Rate Limiting**: The proxy validates the HMAC signature (using Web Crypto API). If valid, it increments a Cloudflare Rate Limiting counter keyed by the token's ID. If the counter exceeds 100 in a 10-minute sliding window, it rejects the request. Otherwise, it forwards the request to the LLM provider.
