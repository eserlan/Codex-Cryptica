# Implementation plan: podcast sync POC

## Approach

Build a self-contained experiment in `scripts/podcast-poc/`. Keep dev-agents, deployed site routes and existing Atom feeds unchanged. The eventual source of release announcements is an approved GitHub Discussion; fixtures substitute for that source during this experiment.

1. Define two or more fictional fixture items with stable IDs, titles, dates, narration and show-note variants. Use an explicitly controlled public email and public artwork; configure deployment URLs rather than embedding secrets.
2. Build with Bun: validate inputs, call the existing `GeminiTTSService`, encode WAV to MP3 using `ffmpeg`, inspect duration using `ffprobe`, hash the finished MP3 bytes and render XML with correctly escaped content. A synthesis or encoding failure stops the build rather than silently omitting an item. Preserve a generated audio file when retesting the same content; TTS and encoding are not assumed deterministic.
3. Upload only to `podcast-poc/` in `codex-cryptica-statics`, audio and artwork first and feed last. Set `audio/mpeg` and `application/rss+xml` content types. Verify HTTP status, lengths, HEAD, byte ranges and a non-browser user agent; log failures. Keep temporary artwork and audio out of Git and remove temporary image files after uploading, as required by repository policy.
4. Connect the isolated feed to Patreon with draft sync. Follow the ordered test protocol in the README: baseline imports, new item, same-GUID text edit, same-GUID replacement audio with a new enclosure URL, repeated GUID with changed date, and invalid enclosure. Observe mobile and desktop; test auto-publish only with a safe empty test audience.
5. Complete the results matrices and decide go/no-go. Document pause/stop and cleanup: synced posts can remain in Patreon, so stopping the feed is not a retraction. Do not claim delivery from a feed upload alone.

## Design boundaries

- Fixture ID maps to an immutable GUID; enclosure URL includes a hash of the actual MP3. Audio replacements use a new URL while retaining the GUID for the sync experiment.
- Store only public, fictional content. The ownership email is public; do not embed the Gemini key in generated output or command logs.
- Use existing XML escaping where practical, while handling embedded HTML and CDATA safely. Test malformed fixture input and failure paths as well as successful rendering.
- A possible production follow-up would place orchestration and approval in dev-agents, with audio/feed publishing in Codex Cryptica. Feed inclusion is not proof Patreon ingested or published an item. Do not settle the production storage, correction or freeze design before the POC results.

## Constitution check

The experiment is a small internal script, not a new product feature or major engine, so a new workspace package and in-app help article are unnecessary. Reuse existing TTS and XML helpers where suitable; keep public test data separate from user vault data. Follow TDD for new logic, with success and meaningful failure tests. Run only impacted tests, changed-file lint and relevant workspace type-checks; full suites belong in CI. No new public discovery page is proposed.

## Validation and dependencies

Prerequisites: Bun, `ffmpeg`, `ffprobe`, a Gemini API key, R2 upload access, a controlled ownership email and Patreon creator access. Verify credentials and access without exposing secrets. Run focused tests for fixture validation, XML and enclosure metadata, TTS/encoding failures and upload verification, then `bun run lint:changed`, `bun run test:changed`, and relevant affected-workspace type-checks. Validate the built feed and MP3s locally before uploading. Live Patreon results cannot be inferred from local checks.
