# Catalogue Provenance Checklist: Biome Explorer

**Purpose**: Release gate for the library's images and facts (quickstart §6). Tick each item only after checking it.
**Image tool**: Gemini 3.1 Flash Image (1-6) / OpenAI GPT-6 Luna via Codex (7-13) (16:9 landscape WebP)
**Tool terms allow commercial use of output — checked on**: 2026-10-22

## Per biome

For each biome: the generated main image (prompt, tool, date, reviewer, review notes, final alt text), an optional licensed photograph (creator, source URL, licence, licence URL, alt text), and at least one cited source for every statement.

| Biome               | Generated image reviewed | Alt text final | Uploaded to R2 | Optional photo (licence checked) | Facts cited |
| ------------------- | ------------------------ | -------------- | -------------- | -------------------------------- | ----------- |
| temperate-woodland  | [x]                      | [x]            | [x]            | n/a                              | [x]         |
| boreal-forest       | [x]                      | [x]            | [x]            | n/a                              | [x]         |
| grassland-steppe    | [x]                      | [x]            | [x]            | n/a                              | [x]         |
| hot-desert          | [x]                      | [x]            | [x]            | n/a                              | [x]         |
| semi-arid-desert    | [x]                      | [x]            | [x]            | n/a                              | [x]         |
| mediterranean-scrub | [x]                      | [x]            | [x]            | n/a                              | [x]         |
| tundra              | [x]                      | [x]            | [x]            | n/a                              | [x]         |
| polar-ice-sheet     | [x]                      | [x]            | [x]            | n/a                              | [x]         |
| wetland             | [x]                      | [x]            | [x]            | n/a                              | [x]         |
| tropical-rainforest | [x]                      | [x]            | [x]            | n/a                              | [x]         |
| coastline           | [x]                      | [x]            | [x]            | n/a                              | [x]         |
| savanna             | [x]                      | [x]            | [x]            | n/a                              | [x]         |
| alpine-montane      | [x]                      | [x]            | [x]            | n/a                              | [x]         |

## Review criteria for a generated image

- [x] Plants, animals and landforms match the biome's own statements
- [x] No impossible features, text, logos or stray people
- [x] Style matches the other nine images
- [x] Not presented as a photograph anywhere in the interface

## Release

- [x] No image files are in the git diff
- [x] Every image URL returns 200 from R2
- [x] `BIOME_RELEASE_GATE=1 bun test packages/biome-engine/tests/catalogue-release.test.ts` passes
