# Patreon podcast sync experiment

This isolated experiment uses fictional public release updates. It does not change the site's Atom feeds or dev-agents. Everything uploaded, including the ownership email, is public; never use paid content, personal information or secrets.

## Prerequisites and build

Install Bun, `ffmpeg`, `ffprobe` and Wrangler; obtain a Gemini API key, R2 upload access, a controlled publicly visible ownership email, and Patreon creator access. The existing Gemini TTS service uses a preview model and returns WAV; availability, voice quality, cost and provider policy must be assessed during the experiment. TTS API use and R2 may incur charges.

Set `GEMINI_API_KEY` and `PODCAST_POC_EMAIL` in your environment, then:

```sh
bun scripts/podcast-poc/build.ts
bun test scripts/podcast-poc/poc.test.ts
```

The default build includes the first two entries of `fixture.json`. Set `PODCAST_POC_ITEM_COUNT=4` to include both answer-based episodes. The generated feed, MP3s and local audio cache are under ignored `out/`. Unchanged narration reuses its MP3; changing narration creates a new content-hashed URL while retaining its GUID. Preserve `out/` between test runs. Back up your test observations separately. The feed uses `itunes:block` as an Apple directory hint, not access control or a guarantee against indexing elsewhere.

## Upload

The feed uses an existing public R2 image, served as a 1400 × 1400 square through Cloudflare Image Resizing. The upload command uploads MP3s before the feed, then checks content type, length, HEAD and byte range using a non-browser user agent. It may leave uploaded objects behind on failure; inspect and clean the isolated prefix.

```sh
bun scripts/podcast-poc/upload.ts
```

Feed URL: `https://assets.codexcryptica.com/podcast-poc/feed.xml`. Inspect the feed and enclosure responses independently if checks fail; a successful upload does not establish Patreon ingestion. Do not commit output or image assets.

## Patreon protocol

1. On desktop, create an isolated podcast and choose **Sync my podcast**, not one-time import. Enter the feed URL, verify ownership, select **Save as draft**, and check audience and notification settings. Record whether the controlled email receives verification.
2. Inspect both imported drafts on desktop and mobile. Record title, paragraphs, lists, emphasis, links, escaping, Unicode, description versus encoded content, artwork, player and post type. Keep evidence free of private account details.
3. Build with `PODCAST_POC_ITEM_COUNT=3` and upload; record elapsed time and whether manual Sync now finds the new item. Reuse generated MP3s.
4. Change one fixture's HTML and narration, rebuild and upload. Check whether text and replacement audio propagate with the same GUID and whether a duplicate is created. Repeat with a changed date, then temporarily test a missing enclosure and record any error. Restore a valid feed afterwards.
5. Only if an isolated test tier/audience with zero real members is available, switch to auto-publish and add a _new_ test item. Record access and notification settings, any notification event, and any actual delivery separately. Otherwise mark these results unverified.
6. Pause or stop sync, remove test posts as appropriate, and remove only test objects from the isolated R2 prefix. Stopping sync does not remove already synced Patreon posts. Record any remaining artefacts or cleanup failures.

## Results: 27 October 2026

Evidence: screenshots supplied during the experiment show the Patreon library, the first synced episode, the answer-based episode and its later inline image. Screenshots are not stored in the repository. The user chose public automatic publication for this test.

| Formatting                                                               | Desktop observation                                                                                          | Mobile     |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ---------- |
| Title, paragraphs, headings, lists, bold, italics, Unicode and ampersand | Rendered in the supplied screenshots                                                                         | Not tested |
| `content:encoded` versus `description`                                   | The richer encoded content appeared in the post; field precedence is inferred from the distinct fixture text | Not tested |
| Links                                                                    | Link displayed in first episode; actual navigation not verified                                              | Not tested |
| Inline article image                                                     | Displayed after updating the existing feed item                                                              | Not tested |
| Audio player and post type                                               | Synced podcast episode with player and duration displayed; audible playback not independently verified       | Not tested |
| Per-episode square artwork                                               | Added to feed; Patreon thumbnail/player update not yet confirmed                                             | Not tested |

| Behaviour                                             | Observation                                                                                                                                     |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial backfill                                      | Two items appeared in Patreon as published, public episodes, in date order. Draft mode was not tested.                                          |
| New item                                              | Answer-based item appeared as a public post after feed update; exact delay and whether sync was manual were not recorded.                       |
| Existing item edit                                    | Inline image added to the existing item appeared after sync; GUID and audio URL were unchanged. No duplicate appeared in the user's screenshot. |
| Audio replacement, changed date and invalid enclosure | Not tested.                                                                                                                                     |
| Notifications                                         | Whether Patreon emitted or delivered notifications is unknown.                                                                                  |
| Pause, stop and cleanup                               | Not tested; feed and public episodes remain live.                                                                                               |

**Security and maintenance:** source feed, ownership email and audio are public regardless of Patreon access settings. R2 HEAD and range checks passed for the feed and MP3s with a non-browser user agent. The Gemini preview model, ffmpeg and ffprobe remain dependencies; actual costs have not been measured. A silent file was not tested.

**Local verification:** eight focused tests passed, including MP3 encoding and failure paths; changed-file lint passed. A standalone TypeScript check could not run because Bun type definitions are not installed at the repository root. Real Gemini narration was generated and uploaded to the isolated R2 prefix.

**Recommendation: go for a separate production design and implementation.** The user judged the result successful, and the observed public post is readable with short narration and an inline image. Before relying on production automation, resolve the untested items above, explicit upstream approval, publication and retry idempotency, corrections, notification settings, access control, costs and rollback. A feed receipt is not a Patreon publication receipt. Decide separately whether to distribute answers, release announcements or both.
