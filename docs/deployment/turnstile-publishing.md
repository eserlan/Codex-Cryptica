# Turnstile Publishing Setup

Guest snapshot publishing is anonymous, but creating a new snapshot is protected by Cloudflare Turnstile to limit automated R2 abuse. Existing snapshots continue to use their private write token for updates, asset uploads, and deletion.

## Create The Widget

1. In Cloudflare, open **Turnstile** and create a widget named `Codex Cryptica publishing`.
2. Use **Invisible** mode. Publishing runs in the background with no visible verification UI.
3. Add the production, staging, and approved preview hostnames. Do not use a wildcard that includes untrusted domains.
4. Copy the widget's site key and secret key.

The client executes Turnstile only after a user confirms publication. The widget uses the `publish_snapshot` action and validates the returned hostname in the Worker.

## Configure Environments

Set the public site key in the web deployment environment:

```text
PUBLIC_TURNSTILE_SITE_KEY=<site-key>
```

The site key is intentionally included in the browser build. Never place the secret in web environment variables, source files, or GitHub repository variables.

Set the secret on the Cloudflare Worker:

```bash
cd apps/workers/oracle-proxy
wrangler secret put TURNSTILE_SECRET_KEY
```

Deploy the Worker after setting the secret. The Worker rejects new snapshot creation with `403` when a token is missing, invalid, expired, has the wrong action, or comes from an unapproved hostname.

## Rate Limits And Quotas

`apps/workers/oracle-proxy/wrangler.toml` configures two Worker rate-limit bindings:

- New snapshot creation: five requests per minute per IP per Cloudflare location.
- Snapshot writes: sixty requests per minute per IP and snapshot per Cloudflare location.

The Worker also limits each bundle to 10 MiB, each asset to 5 MiB, each snapshot to 500 assets and 100 MiB of assets, and only accepts verified PNG, JPEG, WebP, and AVIF uploads. Treat Cloudflare's per-location Worker limits as bot mitigation rather than an accounting system; add edge WAF rules if production abuse requires stricter global limits.

## Test The Flow

1. Set a Turnstile test site key and test secret in the non-production environments.
2. Open Publishing settings and create a new snapshot. Normal traffic should complete without a visible challenge.
3. Confirm that a malformed or missing token receives `403` from `POST /api/publish-vault`.
4. Confirm that updating an existing snapshot still works with its stored write token and does not request a new Turnstile token.

Turnstile tokens are single-use and short-lived. A publisher who leaves the confirmation flow open too long should retry Publish to receive a fresh token.

## Privacy

The public privacy policy references the [Cloudflare Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/), as required for the invisible verification flow.
