# Answer podcast feed

`bun run podcast:publish <answer-slug>` adds one answer to the public podcast feed that
Patreon's podcast sync imports (#4438). dev-agents runs it after an answer deploys; see its
`docs/plans/podcast-answers-channel.md` for the full design.

- **Content:** the episode uses only the answer's reviewed text. The narration is the question,
  then `shortAnswer`, then "Read the full answer at Codex Cryptica." The show notes are the og
  image (if it exists on R2), `shortAnswer`, the section headings and a link to the page.
- **Output on R2** (`codex-cryptica-statics`, served from `https://assets.codexcryptica.com/`):
  - `podcast/answers/feed.xml`: RSS 2.0 + iTunes tags, newest 50 episodes, `max-age=60`.
  - `podcast/answers/episodes.json`: the episode index the feed is rendered from.
  - `podcast/answers/audio/<slug>-<hash>.mp3`: immutable; the hash covers the narration, voice,
    model and encoder settings.
- **Result:** the final stdout line is `{"guid", "audioUrl", "status": "created" | "unchanged"}`.
  Any failure exits non-zero. A slug already in the index is `unchanged` and nothing is written.
- **Retries:** the feed is written before the index, so a failed run can simply be rerun; audio
  that was already uploaded is reused without calling TTS.
- **Requires:** `GEMINI_API_KEY`, `PODCAST_OWNER_EMAIL` (public, shown in the feed for Patreon
  ownership verification), Wrangler R2 access (`CLOUDFLARE_API_TOKEN`), `ffmpeg` and `ffprobe`.
  The checkout must contain the deployed answer.

The script does not lock. dev-agents serializes its own calls, so do not run it by hand while a
release-comms run may be publishing.

Everything written is public, whatever the Patreon access settings. Stopping the feed does not
remove posts Patreon has already synced; delete those in Patreon.
