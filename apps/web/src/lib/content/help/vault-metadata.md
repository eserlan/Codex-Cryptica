---
id: vault-metadata
title: Vault Structure
description: Understand the Markdown files and YAML metadata that make up a portable Codex Cryptica vault.
tags: [markdown, yaml, technical]
rank: 17
---

## How Files are Stored

Codex Cryptica uses standard Markdown files. Use **Save to Folder** to create a filesystem copy you can open in apps such as Obsidian or VS Code. The default browser-local vault is not an ordinary folder you can browse.

### File Format

Each file has a simple "header" (called YAML frontmatter) followed by your writing:

```markdown
---
id: unique-id
title: Character Name
type: character
labels: [noble, ally]
---

# Character Name

Your story starts here...
```

### Tips for Advanced Users

- **Metadata**: You can add your own fields to the header (like `age: 45`). The AI Oracle will see these and use them for extra context.
- **Syncing**: A mirrored local folder can be synchronised by your operating system’s cloud client. Codex does not monitor that transfer. For an app-managed copy, see Google Drive Cloud Sync or Codex Cryptica Cloud Backup.
