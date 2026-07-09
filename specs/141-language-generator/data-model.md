# Data Model: Language Generator

This document specifies the data shapes, metadata, and schemas for the **Language Generator**.

## Data Shapes

### 1. Generator Output Interface

The raw JSON returned by both the AI completion model and the local procedural generator matches the unified `GeneratorOutput` structure:

```typescript
export interface LanguageGeneratorOutput {
  title: string; // Name of the generated language (e.g., "Thranish")
  summary: string; // One-sentence description of the language
  lore: string; // Markdown content containing phonology, naming patterns, glossary, and phrases
  labels: string[]; // Metadata labels (e.g., ["language", "fantasy"])
  connections?: Array<{
    targetTitle: string; // Title of another entity (e.g. faction, species) to link
    relationship: string; // e.g. "spoken by", "originating in"
  }>;
}
```

### 2. Vault Frontmatter Model

When a language is saved into the campaign vault, it is stored as a Note entity containing standard Markdown frontmatter metadata:

```yaml
---
title: "Thranish"
entityType: "note"
kind: "language"
genre: "Classic Fantasy"
tone: "Harsh & Consonant-heavy"
role: "Sacred/Ritual Tongue"
structure: "Compound Words"
labels:
  - "language"
  - "conlang"
---
# Pronunciation & Phonology
...
# Naming Conventions
...
# Example Names
...
# Common Vocabulary & Word Bank
...
# Sample Phrases
...
```

## Validation Rules

- **Language Name**: Must be non-empty and not conflict with existing banned names.
- **Lore Content**: Must contain the following mandatory section headings:
  1. `Pronunciation & Phonology`
  2. `Naming Conventions`
  3. `Example Names`
  4. `Common Vocabulary & Word Bank`
  5. `Sample Phrases`
- **Labels**: Must use unified terminology (Principle XII) and be mapped as a list of labels in the metadata array.
