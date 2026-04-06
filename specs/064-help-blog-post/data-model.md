# Data Model: Comprehensive Help Guide Blog Post

## Entity: BlogArticle (Comprehensive Help Guide)

### Frontmatter (YAML)

| Field         | Type       | Description                                   |
| ------------- | ---------- | --------------------------------------------- |
| `id`          | `string`   | Unique identifier: `comprehensive-help-guide` |
| `slug`        | `string`   | URL path: `comprehensive-help-guide`          |
| `title`       | `string`   | Display title: `Comprehensive Help Guide`     |
| `description` | `string`   | SEO Meta description.                         |
| `keywords`    | `string[]` | SEO Keywords.                                 |
| `publishedAt` | `ISO8601`  | Publication date/time.                        |

### Content Sections (Markdown)

1. **Introduction**: What is Codex Cryptica?
2. **Table of Contents**: Anchor links to sections.
3. **Vaults**: Setting up your first vault, storage types.
4. **Syncing**: OPFS (Local) vs. Google Drive (Cloud).
5. **The Spatial Canvas**: Mapping your ideas visually.
6. **Lore Oracle**: Using AI to build and link lore.
7. **Conclusion**: Next steps and community links.

## Validation Rules

- **Slug unique**: Must not conflict with existing blog posts.
- **Section coverage**: MUST include all sections mentioned in requirements.
- **Accessibility**: Heading hierarchy (H1 -> H2 -> H3) must be strictly maintained.
- **Internal Links**: Must use `base` relative paths or relative slugs (e.g., `spatial-intelligence` without leading slash).
