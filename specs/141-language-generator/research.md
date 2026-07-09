# Research & Decisions: Language Generator

This document records the design decisions and technical specifications resolved during Phase 0 of the planning process for the **Language Generator**.

## Technical Decisions

### Decision 1: Naming & Context Detection in Vault

- **Decision**: Vault entities created by this generator will be saved with the frontmatter key `kind: language` (and categorized under the `"note"` entity type by default, or the `"language"` category if overridden). Other generators will search the vault repository for documents containing this key or matching category labels to populate naming context options.
- **Rationale**: Simple, format-neutral, and integrates directly with the existing `VaultRepository` and FlexSearch index without requiring database migrations.
- **Alternatives considered**:
  - Detecting by category ID only (rejected because many vaults will not have a separate "Language" category, so mapping to generic notes with a specific frontmatter metadata tag is more robust).
  - Tag-based detection (rejected due to Principle XII: Labels Over Tags).

### Decision 2: Local Procedural Fallback Engine

- **Decision**: Implement a lightweight consonant-vowel syllable combiner. It will use mapped templates of consonant/vowel syllable patterns tailored to the chosen linguistic tone (e.g., "Harsh/Gravelly" maps to hard consonants `kr, gr, th, z, x` and short vowels `a, u, o`; "Lyrical" maps to soft consonants `l, m, n, s, v, y` and long vowels `ae, ie, oa, ea`).
- **Rationale**: Zero dependency, incredibly fast, and yields coherent-sounding words that match user input constraints without complex phonetic trees.
- **Alternatives considered**:
  - Pre-defined static lists of mock languages (rejected because it offers zero replay value/variety).
  - Full grammatical parse-tree engine (rejected as over-engineering and violating Principle III: YAGNI).

### Decision 3: UI Implementation and Routing

- **Decision**: Mount the generator form under `apps/web/src/routes/(marketing)/generators/language-generator/` and integrate it as a campaign-generator option in the Campaign Generator Hub. Follow Svelte 5 runes (`$state`, `$derived`, `$props`) and Tailwind 4 semantic classes.
- **Rationale**: Reuses the unified generator framework established by the other campaign generators (e.g. Pantheon, Ship).
