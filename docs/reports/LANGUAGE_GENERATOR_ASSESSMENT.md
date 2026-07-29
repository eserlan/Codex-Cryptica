# Language Generator Assessment

**Assessment date:** 2026-07-29  
**Feature:** `141-language-generator`  
**Primary implementation:** `packages/generator-engine/src/public-language.ts`

## Executive Summary

The language generator is best understood as two systems behind one interface:

- The **AI path** is a detailed conlang-profile prompt capable of producing useful phonology, culture, naming rules, vocabulary, phrases, and table-ready guidance.
- The **local/offline path** is a lightweight pseudo-language word generator. It produces stylistically related names and words, but it does not currently model morphology, grammar, pronunciation, or most selected variations.

The UI advertises **700 preset combinations**—7 genres × 5 tones × 5 roles × 4 name structures—plus custom values and world context. In practice, the local engine has only **five substantive sound systems**. Genre, role, structure, and context have much less influence offline.

The architecture is sound: the framework-free generator lives in the shared `generator-engine` package, the fallback remains client-side, generated languages can be saved and rediscovered, and AI failures degrade to local output. The main opportunity is to turn the local fallback from a tone-based word kit into a compact but genuine rule system.

## Configuration and Variation Surface

| Dimension                       |          Choices | AI effect                                                   | Local effect                                          |
| ------------------------------- | ---------------: | ----------------------------------------------------------- | ----------------------------------------------------- |
| Genre                           |                7 | Strong creative direction, vocabulary, and cultural flavour | Summary text plus one genre-specific glossary concept |
| Tone                            |                5 | Directs phonology, rhythm, and sound                        | Fully controls character fragments and C/V patterns   |
| Language role                   |                5 | Directs register, prestige, taboos, and usage               | Inserted into generic descriptive prose               |
| Name structure                  |                4 | Directs morphology and name construction                    | Named in prose, but does not change construction      |
| World context                   |        Free text | Incorporated into the prompt                                | Ignored                                               |
| Custom tone, role, or structure |        Free text | Interpreted by AI                                           | Unknown tone falls back to generic CVC/CV rules       |
| Custom genre                    | In-app generator | Interpreted by AI                                           | Uses the generic `wanderer` concept                   |

### Genres

- Classic Fantasy
- Cyberpunk / Corporate
- Vampire / Gothic Noir
- Sci-Fi / Space Opera
- Modern Conspiracy
- Post-Apocalyptic
- Pirate

### Tones

- Harsh & Consonant-heavy
- Lyrical & Vowel-rich
- Ancient & Formal
- Clipped & Technical
- Shadowy & Whispered

### Language Roles

- Common Speech
- Sacred / Ritual Tongue
- Imperial Standard
- Thieves' Cant
- Dead Language

### Name Structures

- Compound Words
- Suffix-heavy
- Prefix-heavy
- Short & Monosyllabic

The public form supports custom tone, role, and structure values, a 240-character world context, and “Surprise Me” randomization. Theme-hub launches preserve their supported genre.

## AI Generation Rules

The AI is instructed to answer four questions:

1. What does the language sound like?
2. Who speaks it, and when?
3. How are names and words built?
4. What can a GM immediately use at the table?

### Genre Directions

- **Classic Fantasy:** Archaic and mythic roots handed down through bloodlines and old magic.
- **Cyberpunk / Corporate:** Clipped technical jargon, corporate acronyms, brand names, and loanwords.
- **Vampire / Gothic Noir:** Aristocratic, ecclesiastical, old-world, and faintly ominous roots.
- **Sci-Fi / Space Opera:** Alien-feeling phonemes and terms for ships, factions, and star systems.
- **Modern Conspiracy:** Ordinary modern language mixed with coded slang and acronyms.
- **Post-Apocalyptic:** Corrupted, simplified, or merged remnants of earlier languages.
- **Pirate:** Shipboard commands, weather metaphors, crew oaths, trade slang, and loanwords from many ports, without caricature.

### Required AI Output

The prompt requests:

- A unique language title.
- A one-sentence summary.
- Narrative `content` containing:
  - Pronunciation & Phonology
  - Cultural Role & Usage
  - Naming Conventions
  - A 10–15-word glossary with pronunciation and meaning
  - 3–5 sample phrases with pronunciation and translation
- Compact GM-reference `lore` containing:
  - At a Glance
  - 4–5 example names with meanings and intended uses
  - 2–3 table-use tips
- Labels.

It also instructs the model to:

- Keep every name, word, and phrase consistent with the stated rules.
- Build phrases from glossary words where possible.
- Include at least one unmistakably genre-specific term.
- Avoid generic fantasy-name clichés and supplied banned names.
- Return only a valid JSON object.

## Local and Offline Construction Rules

A generated word consists of one randomly chosen pattern. Each `C` or `V` selects an entire fragment, which may contain several letters.

| Tone                   | Consonant fragments          | Vowel fragments         | Patterns        |
| ---------------------- | ---------------------------- | ----------------------- | --------------- |
| Harsh                  | `kr gr kh z x th br v d t r` | `a u o ur ok ak`        | `CVC CVCC CCVC` |
| Lyrical                | `l m n s v y f r sh`         | `ae ia ea io ele ana i` | `CV CVCV VCV`   |
| Ancient                | `ph th ae r s t n m k l`     | `ae o u aa ii or`       | `CVCV CVC VCCV` |
| Technical              | `t k p d g b r n ts`         | `i e u ek in`           | `CVC VC CV`     |
| Shadowy                | `sh th f s h z ph lh`        | `i o y uu is`           | `CVC CV VCV`    |
| Unknown or custom tone | `k l m n s t r`              | `a e i o u`             | `CVC CV`        |

The number of possible selection paths per word ranges from roughly 495 for Technical to 16,698 for Harsh. Actual distinct spellings are somewhat lower because fragments can overlap.

### Word and Name Assembly

- The language title concatenates two generated words and capitalizes the result.
- Each glossary entry receives one independently generated word.
- Each example name concatenates two generated words.
- No separators, affixes, grammatical particles, plural rules, case markers, or uniqueness checks are applied.
- All four selected name structures currently use the same assembly process.

### Fixed Glossary

The local generator creates ten entries:

1. friend
2. enemy
3. water
4. fire
5. shadow
6. light
7. city
8. journey
9. one genre-specific concept
10. leader

The genre-specific concepts are:

| Genre                 | Added concept |
| --------------------- | ------------- |
| Classic Fantasy       | sword-oath    |
| Cyberpunk / Corporate | network       |
| Vampire / Gothic Noir | bloodline     |
| Sci-Fi / Space Opera  | starship      |
| Modern Conspiracy     | secret        |
| Post-Apocalyptic      | ruin          |
| Pirate                | crew-oath     |
| Unknown genre         | wanderer      |

### Fixed Phrase Templates

- `friend + shadow` is translated as “A friend in shadows.”
- `leader + city` is translated as “The leader of the city.”
- `friend + light` is used as a greeting meaning “friend of light.”

These translations assume unstated grammar such as articles, prepositions, possession, and plurals.

## Saving and Downstream Reuse

Generated languages are returned as active `note` entities with `kind: "language"` and labels containing:

- `language`
- the normalized genre
- `conlang`

When a draft is saved:

- Narrative content and compact reference lore are merged.
- The vault entity receives `kind: "language"`.
- A relationship can be created to the source entity.

Saved languages are rediscovered when either:

- `entity.kind === "language"`, or
- their category ID or category label is `language`.

Up to five profiles are automatically added to generator context. Other AI generators are instructed to follow their naming structures, example names, and glossaries.

There is no user-facing **Naming Language** selector as described in the original specification. The system automatically includes the first five detected profiles. This grounding affects AI prompts; local downstream generators do not procedurally consume saved language rules.

## Strengths

- The AI prompt clearly defines useful, game-focused output.
- Genre direction is concrete and avoids reducing genre to surface labels.
- Content and compact GM-reference lore are separated for presentation and merged for vault storage.
- AI failure and malformed output gracefully fall back to local generation.
- Generated profiles use the repository’s unified label terminology.
- Saved profiles are automatically rediscovered and supplied to other AI generators.
- The implementation follows the library-first and client-side principles in the project constitution.
- The public Svelte form uses runes, semantic theme tokens, accessible labels, help text, and Iconify utility classes.

## Gaps and Risks

1. **Name structure is cosmetic offline.** Suffix-heavy, prefix-heavy, compound, and monosyllabic selections all use the same two-word concatenation algorithm.
2. **Language role is cosmetic offline.** Sacred, imperial, cant, dead, and common variants use identical word construction and vocabulary.
3. **World context is ignored offline.**
4. **Genre has minimal offline influence.** Only one glossary meaning changes.
5. **The local profile falls short of the AI contract.** It provides two phrases, three names, no real pronunciation column, generic cultural guidance, and no meaningful morphology.
6. **The system is orthographic rather than phonological.** Fragments are spelling chunks rather than a phoneme inventory. Some are dubiously classified: `ae` appears as an Ancient consonant, while `ok`, `ak`, `ek`, and `in` are treated as vowels.
7. **No grammar exists.** Phrase translations depend on invisible function words and rules.
8. **No uniqueness enforcement exists.** Vocabulary entries and names may repeat.
9. **Response validation is permissive.** Required headings, counts, pronunciations, glossary structure, and internal consistency are not validated.
10. **Banned-name enforcement is partial.** The in-app pipeline checks the title but not example names, roots, glossary words, or phrases.
11. **Custom values degrade offline.** A custom tone silently switches to the generic sound table.
12. **Marketing breadth exceeds supported genres.** The page mentions cosmic horror, while cosmic horror, western, steampunk, and several theme-hub genres are not selectable.
13. **Saved-language choice is implicit.** Users cannot select which detected language should guide a particular generation.

## Improvement Checklist

### Priority 0 — Make Existing Controls Truthful

- [ ] Implement distinct local name-structure rules:
  - [ ] Compound roots with visible or configurable join rules.
  - [ ] Reusable suffix inventories with defined meanings.
  - [ ] Reusable prefix inventories with defined meanings.
  - [ ] A genuinely monosyllabic path that does not concatenate two words.
- [ ] Make language role affect local generation:
  - [ ] Register and formality.
  - [ ] Allowed speakers and social restrictions.
  - [ ] Role-specific vocabulary and table-use guidance.
- [ ] Make genre affect more than one glossary entry by adding small genre lexicons and loanword strategies.
- [ ] Either make world context influence local output or clearly label it as AI-only when local generation is selected.
- [ ] Give custom tones an explicit fallback notice instead of silently using the generic sound inventory.

### Priority 0 — Validate the Output Contract

- [ ] Introduce a shared runtime schema for AI and local language output.
- [ ] Require non-empty `title`, `summary`, `content`, and `lore`.
- [ ] Validate all required markdown sections.
- [ ] Validate glossary row counts and required columns.
- [ ] Validate example-name and phrase counts.
- [ ] Reject or repair malformed AI output before presenting it.
- [ ] Use the same parser and validation rules in the public and in-app generation paths.
- [ ] Check banned names across titles, example names, roots, glossary words, and direct derivatives.

### Priority 1 — Improve the Procedural Language Model

- [ ] Replace spelling-fragment labels with explicit onset, nucleus, and coda inventories.
- [ ] Correct questionable consonant and vowel classifications.
- [ ] Add syllable-boundary, cluster, and word-length constraints.
- [ ] Define stress and pronunciation rules.
- [ ] Add basic orthography rules for converting sound units into written forms.
- [ ] Add a minimal morphology layer for number, possession, place names, personal names, and titles.
- [ ] Add a small set of function morphemes so sample phrases are actually decomposable.
- [ ] Generate phrase translations from grammar templates instead of assigning English meanings to bare word pairs.
- [ ] Prevent duplicate glossary words and example names within a profile.
- [ ] Support a seed so a language can be regenerated and extended consistently.

### Priority 1 — Improve Saved-Language Reuse

- [ ] Add an explicit Naming Language selector to relevant generators.
- [ ] Let users choose one or more profiles rather than automatically taking the first five.
- [ ] Rank automatic suggestions by source relationship, category, and recent use.
- [ ] Allow saved language profiles to guide local name generation without AI.
- [ ] Store structured sound, morphology, and glossary data alongside readable Markdown.
- [ ] Preserve backwards compatibility for existing `kind: language` notes.

### Priority 2 — Expand Variations and UX

- [ ] Add supported language presets for cosmic horror, western, steampunk, Lancer, and optimistic exploration sci-fi, or narrow the marketing copy.
- [ ] Explain which controls affect AI, local generation, or both.
- [ ] Preview example sounds before generation.
- [ ] Let users regenerate only names, vocabulary, or phrases while preserving the profile’s rules.
- [ ] Add export and copy actions for the glossary and naming rules.
- [ ] Surface the generated seed and selected rule set in the saved profile.

### Testing

- [ ] Add deterministic tests for every tone inventory and pattern family.
- [ ] Prove that every name-structure selection produces materially different construction.
- [ ] Test role-specific and genre-specific local behaviour.
- [ ] Test custom-tone fallback messaging.
- [ ] Test vocabulary and name uniqueness.
- [ ] Test seeded reproducibility.
- [ ] Test runtime rejection or repair of missing sections and malformed glossary tables.
- [ ] Test banned-name collisions in example names and vocabulary.
- [ ] Test explicit saved-language selection and local downstream reuse.
- [ ] Add public-form integration tests for standard, custom, surprise, AI-fallback, and local-only flows.

## Verification

The assessment ran the relevant generator, registry, service, adapter, and vault-context tests:

```text
103 tests passed
0 tests failed
```

The public `LanguageFormFields.svelte` component also passed the Svelte 5 autofixer without reported issues.

## Conclusion

The AI path is a strong RPG language-profile generator. The local path is currently a tone-based fantasy word kit rather than a compact conlang engine. The highest-value next step is to make structure, role, genre, and saved-language context produce real procedural differences, then enforce the advertised output contract through shared runtime validation.
