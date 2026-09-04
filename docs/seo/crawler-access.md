# Search-crawler access (OAI-SearchBot)

Tracking issues: [#2567](https://github.com/eserlan/Codex-Cryptica/issues/2567), [#2568](https://github.com/eserlan/Codex-Cryptica/issues/2568).
Parent: #1225. Related: #291, #1228, #1083, #1155.

`robots.txt` saying `Allow` is only half of crawler eligibility. A request also
has to survive the CDN/WAF stack and come back as the intended public HTML.
This document records the policy, the verification procedure, and the state of
production at the last audit.

## 1. Policy: search discovery vs. model training

`apps/web/static/robots.txt` keeps three groups on purpose:

| Group             | Agents                                   | Intent                                                    |
| ----------------- | ---------------------------------------- | --------------------------------------------------------- |
| `*`               | everything else                          | default open access to the public site                    |
| Search & citation | `OAI-SearchBot`, `PerplexityBot`         | fetch pages so Codex Cryptica can be summarised and cited |
| Model training    | `GPTBot`, `Google-Extended`, `ClaudeBot` | corpus collection for model training                      |

Today all three grant the same access. They are separate groups so that a
future decision about training crawlers can be made **without** touching search
discovery — and so that a change to one is visibly a change to one.

Two robots subtleties this depends on, both covered by unit tests in
`apps/web/src/lib/seo/robots-policy.test.ts`:

- A crawler that matches a named group ignores the `*` group entirely. Every
  named group therefore repeats the rules it still needs.
- Precedence is longest-match-wins, with `Allow` winning an exact-length tie.

Public/private separation is unchanged by any of this: app, vault and guest
routes are client-rendered and unlisted, and nothing here exposes them.

## 2. Verification procedure

```bash
bun run check:crawler-access                       # production
bun run check:crawler-access -- --report           # never fail, just report
bun run check:crawler-access -- --base=https://…   # a Pages preview
bun run check:crawler-access -- --json             # machine-readable
```

`scripts/crawler-access-check.mjs` requests live URLs with OpenAI's published
`OAI-SearchBot` user agent and, per route, asserts:

- HTTP 200, no `cf-mitigated` header, no 403/429/503, no challenge
  interstitial in the body
- no redirect into an authentication route
- crawler-visible `<title>` and `<h1>` — a JS-only shell is large but has
  neither, which a byte-count check alone cannot see
- no `noindex`, from either `<meta name="robots">` or the `X-Robots-Tag` header
- a canonical that is present and on-origin
- **user-agent parity**: the crawler and a desktop-Chrome user agent get the
  same status for `/`, which is how UA-specific blocking would show up

Routes are sampled from the live sitemap (two per family), so new discovery
families are covered automatically as they ship rather than by a hard-coded
list that rots. `/llms.txt`, `/llms-full.txt` and `/sitemap.xml` are always
checked.

The same command also requests representative workspace, vault, Canvas, VTT
and session routes. Those must return `X-Robots-Tag: noindex, nofollow` (or a
crawler-visible equivalent) and must not appear in the sitemap. The guard is
implemented in `apps/web/static/_headers`, because the workspace route group
does not SSR. It is intentionally path-specific: public `/import/*`,
`/generators/*` and other discovery pages retain normal indexability.

The pure logic lives in `apps/web/src/lib/seo/crawler-access.ts` and is unit
tested; the script is the network layer around it.

`.github/workflows/crawler-access.yml` runs the check daily at 05:00 UTC and on
demand (`workflow_dispatch`), because the things that break crawler access —
a WAF rule, a bot-management setting, a header change — happen outside this
repository and would otherwise land silently.

## 3. Cloudflare Crawler Hints / IndexNow

Crawler Hints is a **zone-level Cloudflare configuration**, not an application
integration. When enabled, Cloudflare uses cache-change signals and can notify
IndexNow-supported search engines; Codex Cryptica does not hold an IndexNow key
or submit URLs itself.

Enable or re-enable it in the Cloudflare dashboard:

1. Select the `codexcryptica.com` zone.
2. Go to **Cache / CDN → Configuration → Crawler Hints**.
3. Turn **Crawler Hints** on and record the enablement date below.

To disable it, return to the same control and turn it off. Verify it remains
enabled by reopening that zone-level control, then run `bun run
check:crawler-access` to verify the prerequisites Crawler Hints cannot fix:
the sitemap, canonical URLs, crawlable public HTML, and private-route
`noindex` protection.

| Field                  | Production record                   |
| ---------------------- | ----------------------------------- |
| Crawler Hints enabled  | Pending a zone administrator action |
| Enablement date        | Record in this table when enabled   |
| Direct IndexNow client | Deliberately not implemented        |

Do not add a deploy hook, Worker, API key or submission service unless an
observed production gap is recorded in a separate issue (for example,
deterministic publish-time notifications or missing changed/deleted URL
batches). A passing crawler request does not itself prove the dashboard toggle
is on, so the dashboard remains the source of truth for that setting.

## 4. Cloudflare / WAF audit

Codex Cryptica is a static site on Cloudflare Pages (`wrangler.toml`,
`adapter-static`). There is no Worker in front of the public site and no
user-agent branching in the request path, so the only place a crawler can be
blocked is the Cloudflare zone configuration.

Verified from outside on 2026-08-31 against `https://codexcryptica.com`:

- no `cf-mitigated` header on any sampled route
- no `Just a moment…` / `challenge-platform` interstitial
- identical status codes for `OAI-SearchBot`, `python-requests/2.31`, plain
  `curl` and desktop Chrome — no user-agent-based blocking, and no bot score
  gate that a plain HTTP client trips
- no rate limiting across a full sample run

What still needs a human in the Cloudflare dashboard, because it cannot be
observed from a passing request — re-check after any security change:

- **WAF → Custom rules**: no rule matching on user agent, ASN or
  `cf.client.bot` that would block or challenge the public routes.
- **Security → Bots**: Bot Fight Mode **off** for this zone. It challenges
  unverified automated traffic indiscriminately, including crawlers Cloudflare
  has not verified, and it cannot be scoped per-path.
- **Security → Settings**: Security Level not `High`/`I'm Under Attack`, and no
  Browser Integrity Check that would interstitial a non-browser client.
- **Rate limiting rules**: none that a crawl of a few hundred URLs would trip.
- **Managed IP lists / geo rules**: nothing blocking OpenAI's published
  searchbot address ranges.

Preferred allow strategy, if an exception ever becomes necessary: skip on
Cloudflare's _verified bot_ signal (`cf.client.bot`) or on OpenAI's published
searchbot IP ranges — not on a user-agent string, which anyone can spoof and
which would turn a security control into a bypass.

## 5. Findings from the 2026-08-31 audit

Fixed under #2567:

- **`/tools/dnd-npc-generator` and `/tools/faction-generator` were in the
  sitemap.** Both are 301 stubs to `/generators/npc` and `/generators/faction`.
  Static hosting cannot emit a 301 from a prerendered page, so they shipped as
  empty meta-refresh documents — 108 bytes, no title, no heading, no canonical.
  Discovery crawlers were being handed two content-free URLs. The redirects
  stay; the sitemap entries are gone (`scripts/generate-sitemap.mjs`). Both
  redirect targets were already listed.

Known gaps, recorded rather than fixed here (they print on every run of the
check via its `KNOWN_GAPS` list, so they cannot be quietly forgotten):

- **`/` has no crawler-visible content.** The site root is the application
  shell, deliberately `prerender = false` / `ssr = false`, so crawlers get an
  empty document with no `<title>`, `<h1>`, description or canonical. The
  marketing copy is reachable on the prerendered `/worldbuilding-tool`,
  `/ai-rpg-campaign-manager` and `/free-rpg-campaign-manager` pages, and the
  sitemap still lists `/` at priority 1.0. Giving the root a prerendered
  marketing shell is an architectural change worth its own issue.
- **Missing canonicals** on `/features`, `/for`, `/for/*`, `/privacy` and
  `/terms`. Not harmful on its own — the pages are indexable and carry
  `index, follow` — but they are the only sampled pages without one.

Everything else in the sample — `/answers`, `/examples`, `/blog`,
`/generators/*`, `/solutions/*`, `/vs/*`, `/tools`, `/llms.txt`,
`/llms-full.txt`, `/sitemap.xml`, `/robots.txt` — returned the intended public
content with correct indexability signals and no challenge.

## 5. Two sitemap generators

Note for anyone changing sitemap contents: there are two.
`scripts/generate-sitemap.mjs` writes `apps/web/static/sitemap.xml` during
`prebuild`, and that static file is what production serves. The SvelteKit route
`apps/web/src/routes/sitemap.xml/+server.ts` builds a different list that never
reaches production. Change the script.
