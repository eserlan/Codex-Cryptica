# Language Generator Assessment

**Assessment date:** 2026-07-29  
**Feature:** `141-language-generator`  
**Primary implementation:** `packages/generator-engine/src/public-language.ts`

## Executive Summary

The language generator is best understood as two paths behind one interface:

- The **AI path** is the primary product experience. It should generate campaign-ready fictional languages that are internally consistent, visibly reflect user choices, and can be reused across Codex Cryptica.
- The **local/offline path** is a lightweight fallback for graceful degradation when AI is unavailable.

The highest-value work is therefore not to turn the fallback into a full procedural conlang engine. It is to make the AI path more faithful, more reliable, and structurally reusable.

The central architectural decision is:

> **`LanguageProfileV1` is the canonical definition of a generated language.**

The AI should return the structured profile directly. Human-readable `content` and `lore` are rendered from that validated structure. The system should never depend on parsing generated Markdown back into language rules.

This gives Codex Cryptica one source of truth for validation, saving, presentation, and downstream generation.

Recommended direction:

1. Define and persist a compact, versioned `LanguageProfileV1`.
2. Make genre, tone, role, name structure, custom values, and world context materially shape that profile.
3. Validate the structured response and use bounded repair/regeneration before fallback.
4. Render readable language lore from the validated profile.
5. Let users select one saved language profile as generative context for relevant downstream generators.
6. Keep the local generator reliable and coherent without requiring AI feature parity.

## Product Priority

The **AI-generated language profile is the feature**. The local generator exists for graceful degradation.

Success should primarily be measured by whether an AI-generated language:

- strongly reflects the selected controls and supplied world context;
- remains internally consistent across sound, morphology, naming, vocabulary, phrases, and register;
- has a stable structured representation that can be validated before presentation;
- can be saved and reloaded without losing language rules;
- can guide later generation consistently across Codex Cryptica.

The offline path only needs to remain coherent, usable, and compatible with the minimum fallback contract defined below.

## Canonical Data Flow

The intended architecture is:

```text
User inputs + world context
        ↓
AI generation
        ↓
LanguageProfileV1
        ↓
Runtime validation
        ↓
repair / regenerate if needed
        ↓
validated LanguageProfileV1
        ├── persist with entity
        ├── render content/lore
        └── feed downstream generators
```

The following architecture is explicitly avoided:

```text
AI → Markdown → parse Markdown → structured language rules
```

Markdown is a presentation format, not a data contract.

A renderer may generate the readable `content` and `lore` from `LanguageProfileV1`. Optional AI-authored flavour prose may exist, but it must not become a competing source of truth for phonology, morphology, naming, lexicon, grammar patterns, or register.

## Configuration and Variation Surface

| Dimension | Choices | AI effect today | Product expectation |
| --- | ---: | --- | --- |
| Genre | 7 | Strong creative direction and genre vocabulary | Shape vocabulary domains, history, loanwords, metaphors, and culturally specific concepts |
| Tone | 5 | Directs phonology, rhythm, and sound | Produce recognisably different sound systems and naming texture |
| Language role | 5 | Directs register, prestige, taboos, and usage | Affect vocabulary, social rules, register, phrases, and naming conventions |
| Name structure | 4 | Directs morphology and name construction | Produce visibly different personal, place, title, and lineage construction strategies |
| World context | Free text | Incorporated into the prompt | Ground history, speakers, terminology, influences, and naming in the user's world |
| Custom tone, role, or structure | Free text | Interpreted by AI | Preserve custom intent rather than normalising toward presets |
| Custom genre | In-app generator | Interpreted by AI | Preserve setting-specific vocabulary and cultural logic |

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

The public form also supports custom tone, role, and structure values, a 240-character world context, and “Surprise Me” randomization. Theme-hub launches preserve their supported genre.

## Current AI Generation Rules

The current prompt already asks useful questions:

1. What does the language sound like?
2. Who speaks it, and when?
3. How are names and words built?
4. What can a GM immediately use at the table?

It requests phonology, cultural usage, naming conventions, a 10–15-word glossary, 3–5 phrases, 4–5 example names, table-use guidance, and internal consistency.

This is a strong creative baseline. The main weakness is architectural: these rules are currently expressed primarily as prompt instructions and readable output rather than as a validated canonical language model.

## AI Path Gaps and Risks

1. **Control fidelity is requested but not verified.** Genre, tone, role, structure, custom values, and context can be mentioned without materially changing generated rules and examples.
2. **World context is under-leveraged structurally.** The prompt accepts it, but there is no stable field-level requirement that history, neighbouring cultures, institutions, technologies, religions, or geography influence the resulting language.
3. **Response validation is permissive.** Missing or malformed data can degrade into generic defaults instead of triggering bounded repair or regeneration.
4. **The current output contract is presentation-oriented.** Important language rules live in prose and Markdown instead of a stable structured model.
5. **Internal consistency is requested but not reliably checkable.** Names, glossary words, phrases, and stated rules may contradict one another.
6. **Name-safety enforcement is partial.** Titles and example names require stricter checks than ordinary vocabulary.
7. **Saved-language choice is implicit.** Detected language notes can be injected automatically, but the user cannot explicitly choose the primary language for a generation.
8. **Downstream reuse lacks a stable contract.** Other generators need structured naming, phonology, morphology, lexicon, phrase-pattern, and register data rather than flattened prose.
9. **Marketing breadth exceeds supported presets.** Theme and marketing claims should either align with selectable genres or explicitly describe custom support.

## Structured Language Profile

A generated language should be a reusable worldbuilding asset, not merely a formatted lore note.

### Source of Truth

`LanguageProfileV1` is the canonical representation.

The AI generation contract should require the model to return this structure directly. After validation, Codex Cryptica should render human-readable language content from the structured profile.

The system must not derive the canonical profile by parsing AI-generated Markdown. Doing so would create a brittle round-trip and two potential truths: what the prose says and what the structured data says.

### Proposed V1 Shape

```ts
interface LanguageProfileV1 {
  phonology: {
    sounds: string[];
    rhythm: string;
    pronunciationRules: string[];
  };
  morphology: {
    wordFormation: string[];
    prefixes: Array<{ form: string; meaning: string }>;
    suffixes: Array<{ form: string; meaning: string }>;
    compounding: string;
  };
  naming: {
    personalNamePatterns: string[];
    placeNamePatterns: string[];
    titlePatterns: string[];
    lineagePatterns: string[];
  };
  lexicon: Array<{
    word: string;
    pronunciation: string;
    meaning: string;
    partOfSpeech?: string;
  }>;
  grammar: {
    phrasePatterns: string[];
    functionWords: Array<{ word: string; meaning: string }>;
  };
  register: {
    role: string;
    formality: string;
    socialRules: string[];
  };
}

interface LanguageEntityFields {
  languageProfileVersion: 1;
  languageProfile: LanguageProfileV1;
}
```

The exact schema may evolve, but it should remain deliberately game-focused. The goal is not linguistic completeness; it is enough structured information for later generation to reliably sound like the same language.

### Presentation Model

Readable language output should be rendered from the validated profile, including:

- Pronunciation & Phonology
- Cultural Role & Usage
- Naming Conventions
- Common Vocabulary & Word Bank
- Sample Phrases
- At a Glance
- Example Names
- At the Table

The renderer may combine structured fields into natural prose and tables. Optional generated flavour prose is allowed only where it does not redefine canonical language rules.

### Versioning and Persistence

The structured profile needs an explicit, versioned home in the shared entity schema.

Implementation should extend:

- `EntitySchema`;
- entity creation;
- Markdown frontmatter serialization/loading;
- relevant public/publishing schemas;
- round-trip tests.

Existing `kind: language` notes without structured data remain valid. They use a legacy compatibility path based on readable lore excerpts; they are not silently parsed into `LanguageProfileV1` and treated as equivalent to newly structured profiles.

Future incompatible changes increment `languageProfileVersion` and provide an explicit migration or compatibility adapter.

## Saving and Downstream Reuse

Once saved, a language profile should be usable when generating:

- character names;
- settlement and region names;
- faction names;
- dynasties and lineages;
- ships and vehicles;
- titles and offices;
- religious terms;
- organisations and institutions;
- culturally specific vocabulary.

Relevant generators should expose an explicit **Naming Language / Language Profile** selector instead of relying on whichever detected profiles happen to be included first.

The MVP selects **one primary language profile**.

Multiple-profile blending is intentionally deferred until semantics such as loanword influence, bilingual naming, regional mixture, or creole formation are explicitly designed. Blindly combining several profiles risks contradictory sound and naming rules.

Automatic suggestions may still exist, ideally ranked by source relationship, category, and recent use, but they should not replace explicit choice.

## Name Safety Policy

Language titles and example names behave like entity names and should receive strict prohibited/existing-name checks, including obvious direct derivatives where practical.

Glossary words and phrases are ordinary vocabulary. They should reject exact whole-name collisions, but incidental substrings and short-root overlap should not be treated as violations.

This distinction prevents ordinary language vocabulary from becoming unusably constrained.

## Local / Offline Fallback

The local path currently uses tone-based sound tables and simple C/V fragment combinations. Genre contributes limited vocabulary variation; role, structure, and context have little procedural effect.

This is acceptable as a fallback provided expectations are clear.

The fallback should **not** become a full conlang engine unless future product evidence justifies that investment.

Minimum fallback goals:

- never crash when AI is unavailable;
- return non-empty `title`, `summary`, `content`, `lore`, and `labels`;
- include all required presentation sections;
- include at least 10 unique glossary words;
- include at least 3 unique example names;
- include at least 2 sample phrases;
- include the selected genre, tone, role, and structure in reference output;
- avoid obviously broken sound-table classifications;
- make selected structure/role visible where inexpensive and useful;
- clearly communicate controls or context that are AI-only, where applicable;
- preserve compatibility with saved `kind: language` entities.

Local enhancements should be judged by fallback quality and implementation cost, not by parity with the AI path.

## Current Fallback Rule Appendix

This appendix records the current procedural approach as a regression baseline. Retaining it does not imply that the fallback should grow into a full linguistic simulation.

A generated word selects one pattern and replaces each `C` or `V` with one whole fragment from the corresponding table.

| Tone | Consonant fragments | Vowel fragments | Patterns |
| --- | --- | --- | --- |
| Harsh & Consonant-heavy | `kr gr kh z x th br v d t r` | `a u o ur ok ak` | `CVC CVCC CCVC` |
| Lyrical & Vowel-rich | `l m n s v y f r sh` | `ae ia ea io ele ana i` | `CV CVCV VCV` |
| Ancient & Formal | `ph th ae r s t n m k l` | `ae o u aa ii or` | `CVCV CVC VCCV` |
| Clipped & Technical | `t k p d g b r n ts` | `i e u ek in` | `CVC VC CV` |
| Shadowy & Whispered | `sh th f s h z ph lh` | `i o y uu is` | `CVC CV VCV` |
| Unknown/custom tone | `k l m n s t r` | `a e i o u` | `CVC CV` |

Current assembly behaviour:

- The language title concatenates two independently generated words.
- Each glossary entry receives one independently generated word.
- Each example name concatenates two independently generated words.
- All four name-structure selections use the same assembly algorithm.
- There are no reusable affixes, grammatical particles, agreement rules, or uniqueness checks.
- A custom tone silently uses the generic table.

These are fallback limitations, not the primary product roadmap.

## AI Quality Evaluation Plan

Unit tests can prove that prompts, schemas, renderers, and validators contain intended rules. They cannot prove that a nondeterministic model follows them.

The AI path therefore needs a small repeatable evaluation suite.

Use fixed representative world contexts and vary one control at a time. At minimum, cover:

- all five tones against the same remaining inputs;
- all four name structures against the same remaining inputs;
- contrasting roles such as Common Speech, Sacred / Ritual Tongue, and Thieves' Cant;
- at least three sharply different genres;
- empty, standard, and highly specific world context;
- at least one custom tone, role, structure, and genre.

Score each result on a documented rubric:

| Criterion | Passing expectation |
| --- | --- |
| Control fidelity | The varied control produces observable differences in structured rules and examples |
| Internal consistency | Names, lexicon, and phrases obey the profile's sound and morphology rules |
| Context grounding | Supplied cultures, history, institutions, or concepts materially shape the profile |
| Contract completeness | Every required structured field and minimum collection size is present |
| Presentation fidelity | Rendered Markdown accurately reflects the canonical profile |
| Reusability | The profile contains enough information to guide downstream generation |
| Name safety | Generated titles and names follow the scoped collision policy |

Prompt snapshot tests, schema tests, renderer tests, repair tests, and model evaluation serve different purposes and should remain visible separately.

## Delivery Plan

[Issue #1899](https://github.com/eserlan/Codex-Cryptica/issues/1899) remains the tracking epic.

Implementation should proceed in this dependency order:

1. [#1902 — Versioned structured profile schema and persistence](https://github.com/eserlan/Codex-Cryptica/issues/1902)
2. [#1900 — AI control fidelity and evaluation harness](https://github.com/eserlan/Codex-Cryptica/issues/1900)
3. [#1901 — Shared runtime validation and repair/regeneration](https://github.com/eserlan/Codex-Cryptica/issues/1901)
4. [#1903 — Single saved-language selector and context plumbing](https://github.com/eserlan/Codex-Cryptica/issues/1903)
5. [#1904 — Downstream generator consumption and adherence](https://github.com/eserlan/Codex-Cryptica/issues/1904)
6. [#1905 — Fallback contract hygiene and genre/marketing alignment](https://github.com/eserlan/Codex-Cryptica/issues/1905)

The schema comes first because prompt output, validation, persistence, rendering, and downstream consumption should all target the same canonical contract.

## Improvement Checklist

### Priority 0 — Establish the Canonical Structured Contract

- [ ] Define `LanguageProfileV1` as the source of truth.
- [ ] Version the profile with `languageProfileVersion: 1`.
- [ ] Persist it alongside the language entity.
- [ ] Render readable `content` and `lore` from the profile.
- [ ] Do not parse generated Markdown to reconstruct canonical rules.
- [ ] Preserve a legacy compatibility path for existing readable-only language notes.

### Priority 0 — Strengthen AI Control Fidelity

- [ ] Tone shapes sound inventory, rhythm, phonotactics, and pronunciation guidance.
- [ ] Genre shapes vocabulary domains, linguistic history, loanwords, metaphors, and concepts.
- [ ] Role shapes register, formality, social restrictions, prestige/taboo, specialised vocabulary, and phrase use.
- [ ] Name structure shapes morphology and visibly different personal/place/title/lineage construction rules.
- [ ] World context grounds cultures, history, neighbours, institutions, technologies, religions, and geography where relevant.
- [ ] Custom values preserve user intent instead of normalising toward presets.
- [ ] Examples demonstrate selected rules rather than merely describing them.

### Priority 0 — Validate and Repair AI Output

- [ ] Validate `LanguageProfileV1` with one shared runtime schema.
- [ ] Validate required fields and minimum collection sizes.
- [ ] Detect duplicates and obvious internal contradictions where practical.
- [ ] Apply strict name safety to titles/example names and whole-collision-only policy to ordinary vocabulary.
- [ ] Use bounded repair/regeneration before local fallback.
- [ ] Use the same validation and normalization path in public and in-app generation.
- [ ] Never present a partially valid structured profile as successful AI output.

### Priority 1 — Improve Saved-Language Reuse

- [ ] Add an explicit Language Profile selector to relevant generators.
- [ ] Let users choose one primary profile.
- [ ] Rank automatic suggestions by source relationship, category, and recent use.
- [ ] Feed structured naming, phonology, morphology, lexicon, phrase-pattern, and register rules into downstream AI prompts.
- [ ] Make downstream generators demonstrate adherence to the selected profile.
- [ ] Define graceful behaviour for legacy readable-only language notes.
- [ ] Defer multiple-profile blending until interaction semantics are explicitly designed.

### Priority 2 — UX and Coverage

- [ ] Align language presets with theme-hub genres and marketing claims, or narrow the copy.
- [ ] Explain which controls affect AI generation and which are approximated by fallback.
- [ ] Preview example sounds or names where useful.
- [ ] Let users regenerate names, vocabulary, or phrases while preserving the canonical profile rules.
- [ ] Add export and copy actions for glossary and naming rules.
- [ ] Surface the selected language profile in downstream generation context.

### Fallback Maintenance

- [ ] Fix clearly incorrect consonant/vowel classifications and obvious defects.
- [ ] Prevent duplicate glossary words and example names where inexpensive.
- [ ] Ensure fallback satisfies the minimum output contract.
- [ ] Make AI-only behaviour explicit.
- [ ] Do not expand fallback into a comprehensive procedural conlang engine without separate product justification.

### Testing

- [ ] Test `LanguageProfileV1` schema parsing, versioning, persistence, and round-trip behaviour.
- [ ] Test that rendered Markdown faithfully reflects structured profile data.
- [ ] Test that AI prompts encode genre, tone, role, structure, custom values, and world context distinctly.
- [ ] Run the representative AI evaluation matrix and record rubric results.
- [ ] Test runtime rejection, repair, regeneration, and fallback of malformed structured output.
- [ ] Test scoped name-safety behaviour.
- [ ] Test duplicate-name and duplicate-word handling.
- [ ] Test explicit saved-language selection and downstream context injection.
- [ ] Test legacy `kind: language` notes remain usable.
- [ ] Add public-form integration tests for standard, custom, surprise, AI-fallback, and local-only flows.
- [ ] Keep deterministic fallback tests focused on stability and minimum contract quality.

## Definition of Done

The AI-first improvement is complete when:

- [ ] `LanguageProfileV1` is the canonical language definition and round-trips through save/reload.
- [ ] Human-readable language content is rendered from the validated structured profile rather than parsed into it.
- [ ] Tone, genre, role, name structure, custom values, and world context materially influence AI generation and are visible in structured rules and examples.
- [ ] Malformed AI responses are repaired, regenerated, rejected, or locally replaced according to a documented bounded policy.
- [ ] Strict name checks cover language titles, example names, and direct derivatives; ordinary vocabulary uses whole-name collision checks only.
- [ ] Users can explicitly select one primary saved language profile for relevant downstream generation.
- [ ] Downstream generators consume the selected profile and produce linguistically consistent names and terminology.
- [ ] Existing `kind: language` notes remain compatible through a legacy path.
- [ ] The local generator remains a reliable fallback without requiring AI feature parity.

## Verification Baseline

The original assessment ran the relevant generator, registry, service, adapter, and vault-context tests:

```text
103 tests passed
0 tests failed
```

The public `LanguageFormFields.svelte` component also passed the Svelte 5 autofixer without reported issues.

This baseline should be preserved while the AI-first work is introduced.

## Conclusion

The current AI path is already a strong RPG language-profile generator. The best next step is to improve **fidelity, validation, structure, and reuse**, not to invest heavily in making the offline fallback linguistically complete.

The crucial architectural step is to stop treating a language as generated prose with some reusable hints. A CC language should be a **versioned structured worldbuilding asset**, with Markdown as its presentation.

Generate the language once, then let characters, settlements, factions, ships, dynasties, titles, religions, and other entities consistently inherit its linguistic identity.