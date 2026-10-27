# Podcast sync proof of concept

**Issue:** [#4438](https://github.com/eserlan/Codex-Cryptica/issues/4438)

**Status:** Planned

## Goal

Determine whether Patreon can reliably sync readable, narrated release announcements from a self-hosted podcast feed, and whether the result is suitable for a future dev-agents release-comms destination.

## Scope

Build a standalone Bun-based experiment with at least two fictional, publicly shareable release items and meaningful spoken audio. Host the feed and its assets under an isolated R2 prefix; connect it to Patreon in draft mode; record the actual results and a go/no-go recommendation. The experiment must not alter the existing editorial Atom feeds or production release flow.

A later integration may generate narration from approved GitHub Discussions via dev-agents. This POC does not implement that integration, publish real announcements, or generate audio for `/answers` pages.

## Requirements

- Generate an RSS 2.0 podcast feed with controlled public ownership email, artwork, stable item GUIDs, RFC 822 dates, and unique public audio enclosures with accurate MIME type and byte length.
- Reuse the existing Gemini TTS implementation where practical; fail visibly if synthesis or encoding fails. Produce playable MP3s and record their durations.
- Exercise paragraphs, links, lists, emphasis, escaping, Unicode, `description`, and `content:encoded` across the fixtures.
- Verify public feed and asset responses, including HEAD and byte-range support and absence of WAF challenges for a non-browser user agent.
- Test draft import of at least two items; document desktop and mobile rendering, playback and artwork. Test new-item sync, stable GUID deduplication, text and audio edits, ordering, and a broken enclosure.
- Test auto-publication and notification behaviour only when a test audience with no real members is available. Record a notification event separately from observed delivery; otherwise mark the test unverified.
- Document access settings, public exposure, paid-content risk, provider/encoding dependencies, operational cost, cleanup, and the production integration boundary. Do not include private content or secrets in fixtures, logs, feed or assets.
- Record a go/no-go decision based on evidence, including failures and unverified behaviour. A silent control is optional and must not be presented as evidence of policy support.

## Acceptance

The POC is complete when two items have been tested in Patreon, the formatting and behaviour matrices contain observed results and limitations, and the recommendation explains whether readability and synchronisation justify a separate production implementation. If Patreon access, safe audience or external services are unavailable, record the blocker and leave the relevant acceptance criteria open.
