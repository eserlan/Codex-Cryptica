# YouTube promotional video publishing runbook

**Audience:** Codex Cryptica maintainers and authorised marketing agents.
**Scope:** Upload, verify, schedule and measure promotional videos and Shorts using a local CLI and the official YouTube Data API v3.
**Last verified against upstream documentation:** 2026-11-27.

This is an operator workflow, not an application feature. No paid scheduler, new service, application dependency or deployment is required. Start with YouTube; other social networks can be handled separately.

## Tools and limits

Use [porjo/youtubeuploader](https://github.com/porjo/youtubeuploader), an open-source Go CLI that uses the official API and accepts a JSON metadata file. Download a suitable Linux, macOS or Windows binary from its [releases](https://github.com/porjo/youtubeuploader/releases), verify the checksum if supplied and record the installed version. Install `jq` and `ffprobe` locally for preflight checks.

Google's default allocation is 100 video-upload API calls per day, independently of the ordinary API quota. As of 2 November 2026, an unaudited API project can upload public or unlisted videos within its default quota. A quota extension requires an audit. Channel-level upload restrictions can still apply. Check the [current quota documentation](https://developers.google.com/youtube/data/guides/quota_and_compliance_audits) rather than hardcoding assumptions in automation.

## One-time setup

1. Sign into [Google Cloud Console](https://console.cloud.google.com/) using the Google account that manages the Codex Cryptica YouTube channel.
2. Create a dedicated project for publishing, separate from application infrastructure. Enable [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com).
3. In Google Auth Platform, use [Personal mode](https://support.google.com/cloud/answer/15544987?hl=en) for a single operator and choose **Desktop app** as the OAuth client type. The account that creates the client must be the account that authorises it. If the client is used by an AI-powered agent, follow Google's agent-client configuration guidance.
4. Download the OAuth client JSON. Store it locally as described below. Do not use an API key or a service account for channel uploads: the uploader must have user OAuth authorisation.
5. If using External/Testing instead of Personal mode, add the operator as a test user. Testing-mode refresh tokens generally expire after seven days when using YouTube scopes. An external production app has separate OAuth verification requirements. Personal mode avoids the test-token limit and OAuth app verification, but cannot be converted to a multi-user app later.
6. On the first private upload, the CLI opens a browser for OAuth. Sign in with the intended account, select the correct YouTube channel (particularly if managing multiple channels or Brand Accounts), review the requested permissions, and authorise it. Verify the destination channel in YouTube Studio after the upload.

### Secure local configuration

Run the CLI on the operator's own machine. Keep credentials and refresh tokens outside the Git checkout, campaign folder, logs and AI context.

```bash
umask 077
YOUTUBE_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/codex-cryptica/youtube"
install -d -m 700 "$YOUTUBE_CONFIG"
# Copy the downloaded desktop OAuth JSON to this location:
# $YOUTUBE_CONFIG/client_secrets.json
chmod 600 "$YOUTUBE_CONFIG/client_secrets.json"
youtubeuploader -version
```

Use explicit `-secrets` and `-cache` paths on every invocation. Protect the token cache with mode 600 after initial authorisation. Never commit, attach, print or paste either credential file. If compromised, revoke the application's access in Google Account security, replace the client secret as necessary and reauthorise. For multiple channels, use separate token caches and verify the destination on each run.

## Prepare a campaign

Keep the approved video and its metadata together in a local campaign directory outside the repository. Raw and rendered video files must not be added to Git.

```text
promotions/
  nomad-clan/
    short.mp4
    youtube.json
    upload-result.json    # Local receipt, generated after upload
```

For Shorts, use a portrait or square MP4 lasting no more than three minutes. Our preferred promo format is 1080 x 1920, approximately 15-35 seconds, with the payoff visible in the first seconds. YouTube classifies eligible videos as Shorts automatically; there is no separate Shorts upload endpoint or required #Shorts hashtag. Confirm the classification after processing.

Before upload, review actual playback on a phone-sized display:

- Use real footage of the working generator. Show the result and a compelling use case quickly.
- Confirm the demonstrated capability is available in production, and link to the canonical production page, not staging.
- Remove personal information, account details, credentials, private vault material and unnecessary overlays from the recording.
- Check that the music, artwork and other included assets are licensed for the intended platform and use. Save the licence evidence with the campaign locally; include the required credits. A credit is not a substitute for permission.
- Write a specific title, a concise description with a relevant call to action and a few relevant hashtags. The separate `tags` array is for YouTube keyword metadata, not hashtags. Avoid keyword stuffing; YouTube considers titles and descriptions much more important for discovery.
- Review the audience and synthetic-content disclosures honestly for each video; never set them merely from a template. The example below assumes genuine screen footage, no realistic synthetic or altered content requiring disclosure, and an audience of Game Masters rather than children.

### Example: Nomad Clan Generator

Save the following as `youtube.json` next to `short.mp4`. This example is deliberately **private and unscheduled**. Use the music credit only when the actual soundtrack is Collider and the licence has been checked.

```json
{
  "title": "Would You Hide a Fugitive from a Megacorp?",
  "description": "Generate a cyberpunk nomad clan with a convoy, territory and dangerous campaign hooks. Try the Codex Cryptica Nomad Clan Generator: https://codexcryptica.com/generators/nomad-clan\n\nMusic: Collider by Karl Casey @ White Bat Audio (edited excerpt).\n\n#CyberpunkRED #TTRPG #Cyberpunk #GMPrep",
  "tags": [
    "Cyberpunk RED",
    "cyberpunk RPG",
    "TTRPG",
    "Nomad Clan Generator",
    "Codex Cryptica",
    "Game Master tools"
  ],
  "privacyStatus": "private",
  "madeForKids": false,
  "containsSyntheticMedia": false,
  "categoryId": "20",
  "language": "en"
}
```

The link in a Short description is generally not clickable. Keep it for reference, direct viewers to the channel profile link where appropriate, and do not promise a clickable description link. Use the Gaming category for this example; adjust it to match the campaign.

### Local preflight

From the campaign directory, inspect the metadata and media. These commands make no external requests and do not upload anything.

```bash
jq . youtube.json
jq -e '
  (.title | type == "string" and length > 0 and length <= 100)
  and (.description | type == "string" and length <= 5000)
  and (.tags | type == "array" and all(.[]; type == "string"))
  and (.privacyStatus == "private")
  and (has("publishAt") | not)
  and (.madeForKids | type == "boolean")
  and (.containsSyntheticMedia | type == "boolean")
' youtube.json
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height:format=duration \
  -of json short.mp4
```

Stop if either check fails. Confirm the video has the intended aspect ratio and duration, and listen to the full soundtrack. The JSON checks are a local sanity check, not complete validation of all YouTube limits. Check the aggregate keyword tag limit and any unusual characters against the [video resource reference](https://developers.google.com/youtube/data/reference/rest/v3/videos).

## Upload privately, then review

Uploading is a real write to YouTube even when private. An agent may prepare and validate media and metadata locally; the operator must authorise the upload to the intended channel. Never put a publication date in the first test upload.

```bash
umask 077
YOUTUBE_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/codex-cryptica/youtube"
# Refuse to proceed if there is already a receipt; inspect Studio first.
test ! -e upload-result.json || { echo "Upload receipt exists; check Studio."; exit 1; }
jq -e '.privacyStatus == "private" and (has("publishAt") | not)' youtube.json >/dev/null || exit 1

youtubeuploader \
  -secrets "$YOUTUBE_CONFIG/client_secrets.json" \
  -cache "$YOUTUBE_CONFIG/request.token" \
  -filename short.mp4 \
  -metaJSON youtube.json \
  -metaJSONout upload-result.json
```

Record the video ID returned by the uploader. After authorisation, run `chmod 600 "$YOUTUBE_CONFIG/request.token"` if that file exists. Do not share the credential or token.

Verify the upload in [YouTube Studio](https://studio.youtube.com/):

1. Confirm the video belongs to the correct channel and is **Private**.
2. Wait for processing and copyright checks. Play the full video and verify the audio, resolution, aspect ratio and intended Shorts classification.
3. Confirm title, description, tags, audience setting, disclosures and credits match the approved metadata.
4. If any check fails, leave it private and correct the existing video or render a corrected replacement. Do not schedule a video with unresolved rights or policy issues.

If an upload ends with an ambiguous network error or has no receipt, check Studio and any returned video ID **before retrying** to avoid duplicate uploads.

## Schedule or publish

The operator must explicitly approve the final video, channel, metadata and publication time. Use Europe/Oslo time for planning and record the timezone offset in the request. Friday 22:00, Thursday 21:00 and Saturday 20:00 Oslo time are initial experiments, not established best times; use actual channel audience data when available. Avoid releasing every promo at once.

### Recommended: schedule the reviewed private upload

In YouTube Studio, open the existing private video by its saved ID, select Schedule, enter the approved date/time and confirm. Verify the scheduled time and visibility in Studio. This avoids a second upload.

### CLI: schedule a new upload directly

For later campaigns where the final file and metadata have already been approved, the CLI can upload and schedule in one request. This is an alternative to the private-review upload, **not a second invocation for the same video**.

Set `privacyStatus` to `private` and supply a future RFC 3339 `publishAt` timestamp. For example, 28 November 2026 at 20:00 Oslo time is `2026-11-28T20:00:00+01:00`. Replace the example with the explicitly approved future date. Summer time uses a different offset. A past timestamp can make the video public immediately.

```bash
# Linux/GNU date; paste the approved future timestamp at the prompt.
read -r -p "Approved publish time (RFC 3339 with offset): " PUBLISH_AT
[[ "$PUBLISH_AT" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(Z|[+-][0-9]{2}:[0-9]{2})$ ]] || {
  echo "Use an explicit timezone offset or Z."
  exit 1
}
publish_epoch=$(date -d "$PUBLISH_AT" +%s) || exit 1
test "$publish_epoch" -gt "$(date +%s)" || { echo "Publish time must be in the future."; exit 1; }

jq --arg time "$PUBLISH_AT" \
  '.privacyStatus = "private" | .publishAt = $time' \
  youtube.json > youtube-scheduled.json
jq . youtube-scheduled.json
# Review the generated metadata and verify Studio has no existing upload.
test ! -e upload-result.json || { echo "Upload receipt exists; use the existing video."; exit 1; }
umask 077
YOUTUBE_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/codex-cryptica/youtube"
youtubeuploader \
  -secrets "$YOUTUBE_CONFIG/client_secrets.json" \
  -cache "$YOUTUBE_CONFIG/request.token" \
  -filename short.mp4 \
  -metaJSON youtube-scheduled.json \
  -metaJSONout upload-result.json
```

Confirm the saved schedule in Studio immediately and check again after the expected release time. Scheduling on YouTube does not require the local CLI or workstation to remain running. To cancel or postpone, edit the existing video in Studio; restore private visibility if needed. Do not delete a published video or upload a duplicate without operator approval.

For a future custom client, the equivalent API operation is [videos.insert](https://developers.google.com/youtube/data/reference/rest/v3/videos/insert), with `snippet.title`, `snippet.description`, `snippet.tags`, `snippet.categoryId`, `status.privacyStatus` and `status.publishAt`. For an existing video, use [videos.update](https://developers.google.com/youtube/data/reference/rest/v3/videos/update) with the appropriate parts and preserve all existing mutable fields in those parts. Do not call insert again to change metadata.

## Measure results

Keep a simple campaign record: generator/asset version, platform, video ID, title, actual publication time, music credit/licence reference and metrics at 24 hours and seven days. Use YouTube Studio initially, or add read-only API tooling later.

Track engaged views, average view duration, retention, likes and comments, rather than raw views alone. Compare similar videos across publication times and hooks. Evaluate site-side engagement using the [Public Generator Growth Runbook](./PUBLIC_GENERATOR_GROWTH_RUNBOOK.md); do not equate video views with generator visits or successful vault imports. Where a clickable profile link is available, use agreed campaign attribution parameters to distinguish referral traffic.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| OAuth authorisation fails | Check the project, enabled API, desktop client type, intended account and consent mode. For Personal mode use the creator's Google account. |
| Token expires or is revoked | Reauthorise using the correct account. Testing-mode tokens can expire after seven days; prefer Personal mode for a single operator. |
| Wrong channel selected | Stop. Leave any uploaded video private, verify the destination in Studio and use a separate, correctly authorised token cache. |
| Quota or daily upload limit | Check Google Cloud quotas and channel limits. Wait for the applicable reset; do not create extra projects to bypass limits. |
| Invalid scheduled date | Verify RFC 3339, explicit offset, future time and private status. |
| Missing or incorrect metadata | Inspect the CLI's JSON file and Studio. Correct the existing video, not a new upload. JSON values take precedence over corresponding CLI flags. |
| Copyright claim or restriction | Keep the video private; verify the licence and use the Studio claim/dispute process where appropriate, or replace the asset. |
| Video not classified as a Short | Wait for processing, inspect the aspect ratio and duration, check Studio's Shorts tab and review YouTube's current eligibility rules. |

## Later automation (optional, not implemented)

Once the manual CLI workflow is verified, a small Bun wrapper could prepare metadata, run preflight, preview the approved publication plan, invoke the existing uploader and record the returned ID. Use a private-by-default mode and an explicit approval gate for public/scheduled publication. Use separately scoped read-only credentials for analytics where possible. Add Instagram, TikTok and Bluesky only after evaluating their official upload APIs, eligibility, authorisation and platform-specific limits; do not assume YouTube credentials or metadata are portable.

No GitHub Actions publishing job, service account or automatic public upload is required for the first iteration.

## References

- [YouTube Data API: upload a video](https://developers.google.com/youtube/data/guides/uploading_a_video)
- [YouTube video resource and scheduling fields](https://developers.google.com/youtube/data/reference/rest/v3/videos)
- [API quota and compliance audits](https://developers.google.com/youtube/data/guides/quota_and_compliance_audits)
- [YouTube Data API revision history](https://developers.google.com/youtube/data/revision_history)
- [Google Auth Platform / Personal mode](https://support.google.com/cloud/answer/15544987?hl=en)
- [Google OAuth token expiry](https://developers.google.com/identity/protocols/oauth2)
- [YouTube Shorts eligibility](https://support.google.com/youtube/answer/15424877)
- [YouTube tags](https://support.google.com/youtube/answer/146402)
- [YouTube Shorts links](https://support.google.com/youtube/answer/13748639)
- [youtubeuploader CLI and JSON metadata](https://github.com/porjo/youtubeuploader)
