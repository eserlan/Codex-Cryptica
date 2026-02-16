---
id: vault-metadata
title: Vault Structure
tags: [markdown, yaml, technical]
rank: 11
---

## How Files are Stored

Codex Cryptica uses standard Markdown files. You can even open your vault folder in other apps like Obsidian or VS Code.

### File Format

Each file has a simple "header" (called YAML frontmatter) followed by your writing:

```markdown
---
id: unique-id
type: npc
tags: [noble, ally]
status: alive
---

# Character Name

Your story starts here...
```

### Tips for Advanced Users

- **Metadata**: You can add your own fields to the header (like `age: 45`). The AI Oracle will see these and use them for extra context.
- **Syncing**: Because these are just files, you can use any cloud service (Dropbox, OneDrive, etc.) to keep them synced across devices.
