# Tasks: podcast sync POC

## Build and local verification

- [x] T01 Create a feature branch and `scripts/podcast-poc/` scaffolding; document prerequisites and isolated R2 paths.
- [x] T02 Add at least two fictional release fixtures with stable IDs, narration and varied formatting; define optional silent control separately.
- [x] T03 Write focused success and failure tests for fixture validation and safe RSS/XML rendering, including stable GUIDs, unique enclosure URLs, escaping and byte lengths.
- [x] T04 Implement Bun build: reuse Gemini TTS, fail on null/error, encode MP3, probe duration, hash final bytes and render the RSS 2.0 feed.
- [x] T05 Add focused tests for TTS/encoder failures and local output validation; ensure credentials and generated files are not committed.
- [x] T06 Implement isolated R2 upload and public verification for MIME types, byte length, HEAD, byte ranges and non-browser access; test relevant failure handling.
- [ ] T07 Run local feed/audio checks, impacted tests, changed-file lint and applicable affected-workspace type-checks; record results.

## Live experiment

- [ ] T08 Upload fixtures and artwork to the isolated prefix, verify public responses and delete temporary local images after upload.
- [ ] T09 Connect Patreon with ownership verification and draft mode; record settings and import at least two items.
- [ ] T10 Record formatting, playback and artwork on desktop and mobile; compare `description` and `content:encoded`.
- [ ] T11 Test new item, sync delay/manual sync, same-GUID edits and replacement audio, changed date, ordering and a broken enclosure; record observed behaviour.
- [ ] T12 If a safe empty audience exists, test a new item with auto-publish and record notification event and actual delivery separately; otherwise record as unverified.
- [ ] T13 Pause or stop sync and clean up test posts and isolated assets as appropriate; record what remains and any cleanup failure.

## Decision

- [ ] T14 Complete formatting and behaviour matrices, security and maintenance assessment, evidence links and a justified go/no-go recommendation in the README.
- [ ] T15 If warranted, describe separate follow-up work for dev-agents orchestration and Codex Cryptica publishing, including approval, retries, corrections, rollback and the difference between a feed receipt and Patreon publication.
