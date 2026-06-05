# Reddit Devlog Teaser: Interactive Campaign Timeline Editing

## Subreddit Title Options

1. **[I built]** I added interactive drag-and-drop timeline editing to my local-first campaign manager
2. **[Showcase]** Teaser: Drag-and-drop timeline planning and semantic date placement
3. **[Devlog]** A teaser of the new interactive timeline editor functionality

---

## Recommended Post Body

For context: I’m building Codex Cryptica, a local-first campaign manager for GMs. I’ve been working on turning the read-only timeline view into a direct-manipulation editor.

Here is a quick tease of the new timeline functionality:

- **Direct Drag-and-Drop**: You can grab characters, factions, or notes directly from your explorer sidebar and drop them anywhere onto the campaign timeline ruler to place them in time.
- **Semantic Date Popovers**: When you drop a character or faction, the interface automatically detects the entity type and prompts you to define what the date represents (e.g., "Born" or "Died" for characters, "Founded" or "Dissolved" for factions), writing the changes back to their markdown files.
- **Interactive Timeline Handles**: Existing events and lifelines render with grabbable timeline handles, letting you shift dates interactively by sliding them horizontally.

Everything runs entirely client-side, offline, and private in the browser.

---

## Closing Discussion Question

When preparing or running campaigns, do you find yourself relying more on spatial relationship maps (node graphs) or sequential timelines to keep track of your lore?
