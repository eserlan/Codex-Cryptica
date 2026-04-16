# Data Model: Release History

## Canonical Data Source

File: `apps/web/src/lib/content/changelog/releases.json`

## Entity: `ReleaseEntry`

| Field        | Type       | Description                             | Example                          |
| ------------ | ---------- | --------------------------------------- | -------------------------------- |
| `version`    | `string`   | Semver version number                   | `"0.18.0"`                       |
| `title`      | `string`   | Descriptive title for the update        | `"The Tactical Explorer Update"` |
| `date`       | `string`   | ISO 8601 date string (YYYY-MM-DD)       | `"2026-04-16"`                   |
| `type`       | `string`   | Impact level: `major`, `minor`, `patch` | `"minor"`                        |
| `highlights` | `string[]` | List of high-signal changes             | `["Feature A: Description"]`     |

## Usage

- **(app) Space**: Loaded via `ChangelogModal.svelte`.
- **(marketing) Space**: Loaded via `routes/(marketing)/changelog/+page.ts`.
