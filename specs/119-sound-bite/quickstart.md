# Quickstart: Sound Bite

Sound Bite generates a short AI-narrated audio clip for any entity using Google Gemini TTS. Clips are saved locally to your device and can be replayed any time without an internet connection.

---

## Opening the Sound Bite Modal

Click the **volume icon** in the entity header — visible in both the sidebar panel and Zen Mode.

- **Volume-2 icon** (filled speaker): a saved clip already exists for this entity.
- **Volume-x icon** (muted speaker): no saved clip yet.

The modal opens as a **bottom sheet on mobile** or a **centred card on desktop**.

---

## Generating a Clip

1. Open the modal for the entity you want.
2. Choose a **voice mode**: Male, Female, or Neutral.
3. Optionally pick a **tone** (e.g., Scholarly, Heroic, Mysterious, Calm). The tone shapes both the voice selection and the narration style.
4. Press **Generate**. Generation typically takes 5–20 seconds.
5. The clip plays automatically when ready.

If generation fails, an error message is shown and you can retry immediately.

---

## Saving a Clip

Press **Save** below the player to store the clip with the entity. Saved clips:

- Are stored locally on your device (no server upload).
- Are tied to the entity's ID — one clip per entity.
- Restore the voice mode and tone you used, so you can regenerate in the same style later.

To **replace** a saved clip, generate a new one and press Save again.

---

## Deleting a Clip

Press **Delete** to remove the saved clip from this entity. The audio file is deleted from local storage and the entity's saved-bite indicator is cleared.

---

## Voice Guide

| Voice Mode | Tone       | Character                |
| ---------- | ---------- | ------------------------ |
| Male       | Scholarly  | Deep, measured, academic |
| Male       | Heroic     | Bold, commanding         |
| Male       | Mysterious | Low, conspiratorial      |
| Female     | Scholarly  | Articulate, precise      |
| Female     | Heroic     | Clear, determined        |
| Female     | Mysterious | Soft, unsettling         |
| Neutral    | Calm       | Even, authoritative      |
| Neutral    | Dramatic   | Expressive, narrative    |

Gemini uses 28 prebuilt voices selected by the tone keyword. Unknown or omitted tones fall back to a sensible default per gender bucket.

---

## Using Your Own Gemini API Key

Go to **Settings → Intelligence** and enter your Google AI Studio API key. When a personal key is configured, all sound bite generation calls go directly to Google — bypassing the shared system proxy and its rate limits.

---

## Guest Sessions

Guest users can **play** existing saved clips on entities that have them, but cannot generate or save new clips. The sound bite button is hidden on entities without a saved clip.

---

## Technical Notes

- Audio is stored in OPFS (Origin Private File System) under `audio/{entityId}_soundbite.wav`.
- If OPFS is unavailable in your browser, generated clips are playable in the session but cannot be saved.
- The feature requires an internet connection for generation (Gemini TTS call). Playback of saved clips is fully offline.
