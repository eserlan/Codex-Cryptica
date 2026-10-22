# Catalogue Provenance Checklist: Biome Explorer

**Purpose**: Release gate for the library's images and facts (quickstart §6). Tick each item only after checking it.
**Image tool**: _(record the model name used by the app's image-generation path)_
**Tool terms allow commercial use of output — checked on**: _(date)_

## Per biome

For each biome: the generated main image (prompt, tool, date, reviewer, review notes, final alt text), an optional licensed photograph (creator, source URL, licence, licence URL, alt text), and at least one cited source for every statement.

| Biome               | Generated image reviewed | Alt text final | Uploaded to R2 | Optional photo (licence checked) | Facts cited |
| ------------------- | ------------------------ | -------------- | -------------- | -------------------------------- | ----------- |
| temperate-woodland  | [ ]                      | [ ]            | [ ]            | n/a                              | [ ]         |
| boreal-forest       | [ ]                      | [ ]            | [ ]            | n/a                              | [ ]         |
| grassland-steppe    | [ ]                      | [ ]            | [ ]            | n/a                              | [ ]         |
| hot-desert          | [ ]                      | [ ]            | [ ]            | n/a                              | [ ]         |
| tundra              | [ ]                      | [ ]            | [ ]            | n/a                              | [ ]         |
| wetland             | [ ]                      | [ ]            | [ ]            | n/a                              | [ ]         |
| tropical-rainforest | [ ]                      | [ ]            | [ ]            | n/a                              | [ ]         |
| coastline           | [ ]                      | [ ]            | [ ]            | n/a                              | [ ]         |
| savanna             | [ ]                      | [ ]            | [ ]            | n/a                              | [ ]         |
| alpine-montane      | [ ]                      | [ ]            | [ ]            | n/a                              | [ ]         |

## Review criteria for a generated image

- [ ] Plants, animals and landforms match the biome's own statements
- [ ] No impossible features, text, logos or stray people
- [ ] Style matches the other nine images
- [ ] Not presented as a photograph anywhere in the interface

## Release

- [ ] No image files are in the git diff
- [ ] Every image URL returns 200 from R2
- [ ] `BIOME_RELEASE_GATE=1 bun test packages/biome-engine/tests/catalogue-release.test.ts` passes
