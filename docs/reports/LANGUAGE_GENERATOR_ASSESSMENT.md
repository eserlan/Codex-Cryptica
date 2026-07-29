# Language Generator Assessment

**Assessment date:** 2026-07-29  
**Feature:** `141-language-generator`  
**Primary implementation:** `packages/generator-engine/src/public-language.ts`

## Executive Summary

The language generator is best understood as two paths behind one interface:

- The **AI path** is the primary product experience. It should generate campaign-ready fictional languages that are internally consistent, visibly reflect user choices, and can be reused across Codex Cryptica.
- The **local/offline path** is a lightweight fallback for graceful degradation when AI is unavailable.

The highest-value work is not to turn the fallback into a full procedural conlang engine. It is to make the AI path more faithful, more reliable, and structurally reusable.

The central architectural decisions are:

> **`LanguageProfileV1` is the canonical definition of a generated language.**
>
> **Both AI and local generation produce the same versioned result contract, but shared schema does not imply equal richness.**

`LanguageGenerationResultV1` is the versioned generator boundary. Both producers return that shape. Codex Cryptica structurally validates it, applies the appropriate AI- or fallback-quality policy, persists the profile, renders human-readable `content` and `lore`, and reuses the same profile downstream.

Generated Markdown is presentation only. It is never parsed to reconstruct canonical language rules.

## Product Priority

The **AI-generated language profile is the feature**. The local generator exists for graceful degradation.

Success should primarily be measured by whether an AI-generated language:

- strongly reflects the selected controls and supplied world context;
- remains internally consistent across sound, morphology, naming, vocabulary, phrases, and register;
- has a stable structured representation that can be validated before presentation;
- can be saved and reloaded without losing language rules;
- can guide later generation consistently across Codex Cryptica.

The fallback only needs to remain coherent, useful, and compatible with the same structural contract and the documented minimum fallback-quality policy.

## Canonical Data Flow

```text
User inputs + world context
        ↓
AI response JSON (unknown) OR local structured candidate
        ↓
parse + normalize candidate
        ↓
shared structural validation
        ↓
AI-quality validation OR fallback-quality validation
        ↓
repair / regenerate AI if needed
        ↓
validated LanguageGenerationResultV1
        ├── persist canonical profile
        ├── render content/lore
        └── feed downstream generators
```

The following architecture is explicitly avoided:

```text
AI → Markdown → parse Markdown → structured language rules
```

Markdown is a presentation format, not a data contract. Optional AI-authored flavour prose may exist only where it does not redefine canonical phonology, morphology, naming, lexicon, grammar patterns, register, or other structured rules.

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

The current prompt asks four useful questions:

1. What does the language sound like?
2. Who speaks it, and when?
3. How are names and words built?
4. What can a GM immediately use at the table?

It requests:

- a unique language title;
- a one-sentence summary;
- Pronunciation & Phonology;
- Cultural Role & Usage;
- Naming Conventions;
- a 10–15-word glossary with pronunciation and meaning;
- 3–5 sample phrases with pronunciation and translation;
- 4–5 example names with meanings and intended uses;
- 2–3 table-use tips;
- internal consistency across names, words, phrases, and stated rules.

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

## Structured Language Contract

A generated language should be a reusable worldbuilding asset, not merely a formatted lore note.

### Source of Truth

`LanguageGenerationResultV1` is the versioned generator boundary. `LanguageProfileV1` is the canonical representation of the language rules inside it.

The AI returns the structure directly. The local generator constructs the same structure from its procedural tables. After validation, Codex Cryptica renders readable output from the validated profile.

The system must not derive the canonical profile by parsing AI-generated Markdown. Doing so would create a brittle round-trip and two potential truths: what the prose says and what the structured data says.

### Shared Type, Different Richness

AI and fallback generation use the same canonical type, but they do **not** have the same completeness expectations.

The V1 contract should therefore separate:

- a **universally required core** that every producer can honestly provide;
- **optional/enrichment fields** that the AI path is expected to populate when its contract requires them, but which the fallback may legitimately leave absent or empty.

This prevents two bad outcomes:

1. separate AI and fallback data models that drift apart; and
2. meaningless fallback filler such as `Unknown history`, `Regular stress`, or invented morphology added only to satisfy AI-oriented required fields.

Absence is preferable to fabricated semantics when the fallback has no real rule to contribute.

### Proposed V1 Shape

The exact optionality should be finalised in #1902, but the contract should look roughly like this:

```ts
interface LanguageGenerationResultV1 {
  version: 1;
  title: string;
  summary: string;
  labels: string[];
  profile: LanguageProfileV1;
}

interface LanguageProfileV1 {
  inputs: {
    genre: string;
    tone: string;
    role: string;
    structure: string;
    worldContext?: string;
  };

  culture?: {
    speakers?: string;
    history?: string;
    usage?: string;
    influences?: string[];
  };

  phonology: {
    consonants: string[];
    vowels: string[];
    phonotactics: string[];
    rhythm?: string;
    stress?: string;
    pronunciationRules?: string[];
  };

  morphology?: {
    wordFormation?: string[];
    prefixes?: Array<{ form: string; meaning: string }>;
    suffixes?: Array<{ form: string; meaning: string }>;
    compounding?: string;
  };

  naming: {
    personalNamePatterns?: string[];
    placeNamePatterns?: string[];
    titlePatterns?: string[];
    lineagePatterns?: string[];
    examples: Array<{
      name: string;
      meaning: string;
      use: "person" | "place" | "title" | "lineage" | "other";
    }>;
  };

  lexicon: Array<{
    word: string;
    pronunciation: string;
    meaning: string;
    partOfSpeech?: string;
  }>;

  grammar: {
    phrasePatterns?: string[];
    functionWords?: Array<{ word: string; meaning: string }>;
    examples: Array<{
      text: string;
      pronunciation: string;
      translation: string;
      breakdown?: string;
    }>;
  };

  register: {
    role: string;
    formality?: string;
    socialRules?: string[];
  };

  tableUseTips: string[];
}

interface LanguageEntityFields {
  languageProfileVersion: 1;
  languageProfile: LanguageProfileV1;
}
```

The core should remain deliberately game-focused. The goal is enough structured information to render the promised profile and make later generation reliably sound like the same language, not linguistic completeness.

## Validation Model

Validation should be layered rather than forcing one completeness standard onto every producer.

### 1. Structural Validation

Shared by AI and local output. It should verify:

- `LanguageGenerationResultV1` wrapper shape and version;
- non-empty title, summary, and labels;
- required core profile objects and types;
- selected genre, tone, role, and structure;
- valid collections and item shapes;
- canonical invariants and scoped name safety where universally applicable.

### 2. AI Quality Validation

Applied after structural validation to AI output. It should enforce the richer feature contract, including:

- substantive control fidelity;
- world-context grounding;
- required AI enrichment such as cultural detail, pronunciation guidance, morphology, register, or naming rules where specified;
- 10–15 lexicon entries;
- 4–5 example names;
- 3–5 phrase examples;
- 2–3 table-use tips;
- practical consistency between stated rules and examples;
- required pronunciations and other feature-level completeness.

### 3. Fallback Quality Validation

Applied after structural validation to local output. It should enforce only a minimum coherent contract:

- at least 10 unique lexicon entries;
- at least 3 unique example names;
- at least 2 phrase examples;
- selected inputs recorded in the profile;
- enough sound, naming, phrase, and reference data for the renderer to produce the minimum presentation;
- no fabricated enrichment added solely to imitate AI completeness.

The same type and renderer are used in both cases. The quality bar is intentionally different.

## Presentation Model

Readable language output is rendered from the validated profile. The renderer should produce:

- Pronunciation & Phonology
- Cultural Role & Usage
- Naming Conventions
- Common Vocabulary & Word Bank
- Sample Phrases
- At a Glance
- Example Names
- At the Table

For a rich AI profile, the renderer can use all available enrichment. For a minimum fallback profile, it should gracefully omit or simplify detail that is genuinely unavailable rather than inventing it.

Optional generated flavour prose is allowed only where it does not redefine canonical structured rules.

## Versioning and Persistence

The structured profile needs an explicit, versioned home in the shared entity schema.

Implementation should extend:

- `EntitySchema`;
- entity creation;
- Markdown frontmatter serialization/loading;
- relevant public/publishing schemas;
- round-trip tests.

Existing `kind: language` notes without structured data remain valid. They use a legacy compatibility path based on readable lore excerpts; they are not silently parsed into `LanguageProfileV1` and treated as equivalent to native structured profiles.

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

With no selection, no saved language is authoritative and the generator must not silently inject the first detected profiles as naming rules. The UI may suggest a profile, ideally ranked by source relationship, category, and recent use, but the user must confirm it before it becomes authoritative context.

Downstream consumers must tolerate legitimately absent optional enrichment. They should use the information the selected profile actually contains rather than assuming every language has AI-level detail.

## Name Safety Policy

Language titles and example names behave like entity names and should receive strict prohibited/existing-name checks, including obvious direct derivatives where practical.

Glossary words and phrases are ordinary vocabulary. They should reject exact whole-name collisions, but incidental substrings and short-root overlap should not be treated as violations.

This distinction prevents ordinary language vocabulary from becoming unusably constrained.

## Local / Offline Fallback

The local path currently uses tone-based sound tables and simple C/V fragment combinations. Genre contributes limited vocabulary variation; role, structure, and context have little procedural effect.

This is acceptable as a fallback provided expectations are clear.

The fallback should **not** become a full conlang engine unless future product evidence justifies that investment.

It must construct a structurally valid `LanguageGenerationResultV1` and satisfy the fallback-quality policy. This keeps parsing, rendering, persistence, and downstream reuse on one data path without requiring AI feature parity.

### Minimum Fallback Goals

- never crash when AI is unavailable;
- return a structurally valid V1 result with non-empty `title`, `summary`, and `labels` plus the universally required profile core;
- include at least 10 unique lexicon entries;
- include at least 3 unique example names;
- include at least 2 phrase examples;
- record selected genre, tone, role, and structure;
- provide enough sound/naming/reference data for all minimum presentation sections to render;
- avoid obviously broken sound-table classifications;
- make selected structure and role visible where inexpensive and useful;
- clearly communicate controls or context that are AI-only, where applicable;
- preserve compatibility with saved `kind: language` entities;
- leave unavailable optional enrichment absent/empty rather than generating placeholder semantics.

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

- the language title concatenates two independently generated words;
- each glossary entry receives one independently generated word;
- each example name concatenates two independently generated words;
- all four name-structure selections use the same assembly algorithm;
- there are no reusable affixes, grammatical particles, agreement rules, or uniqueness checks;
- a custom tone silently uses the generic table.

These are fallback limitations, not the primary product roadmap.

The fixed local glossary meanings are:

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

| Genre | Genre-specific concept |
| --- | --- |
| Classic Fantasy | sword-oath |
| Cyberpunk / Corporate | network |
| Vampire / Gothic Noir | bloodline |
| Sci-Fi / Space Opera | starship |
| Modern Conspiracy | secret |
| Post-Apocalyptic | ruin |
| Pirate | crew-oath |
| Unknown/custom genre | wanderer |

The fixed phrase templates are:

- `friend + shadow` → “A friend in shadows.”
- `leader + city` → “The leader of the city.”
- `friend + light` → greeting meaning “friend of light.”

These translations rely on unstated articles, prepositions, possession, and plural rules.

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
| AI contract completeness | The rich AI profile contains the required fields, counts, and substantive enrichment |
| Presentation fidelity | Rendered Markdown accurately reflects the canonical profile |
| Reusability | The profile contains enough information to guide downstream generation |
| Name safety | Generated titles and names follow the scoped collision policy |

Use this repeatable scoring procedure:

- Generate three results per evaluation case.
- Score every criterion from `0` to `2`:
  - `0` — absent, contradictory, or unusable;
  - `1` — partially demonstrated or inconsistent;
  - `2` — clearly demonstrated and internally consistent.
- A case passes only when:
  - all three results pass structural and AI-quality validation;
  - no criterion receives `0`;
  - the mean score across all criteria and samples is at least `1.5`.
- Record the model ID, prompt/schema version, date, exact inputs, raw structured results, evaluator, criterion scores, and failure notes.

Prompt snapshot tests, structural schema tests, quality-policy tests, renderer tests, repair tests, and model evaluation serve different purposes and should remain visible separately.

## Bounded Repair and Fallback Policy

The AI path uses a fixed maximum sequence:

1. Parse and structurally validate the initial AI response, then apply AI-quality validation.
2. If invalid, make one targeted repair attempt using structural and/or quality errors.
3. If still invalid, make one clean regeneration attempt.
4. If still invalid or unavailable, generate the local structured fallback.
5. Structurally validate the fallback and apply fallback-quality validation.
6. If fallback validation fails, show a clear user-facing error rather than presenting partial output.

This policy bounds latency and model usage while giving recoverable failures a focused correction opportunity.

## Delivery Plan

[Issue #1899](https://github.com/eserlan/Codex-Cryptica/issues/1899) remains the tracking epic.

Implementation should proceed in this dependency order:

1. [#1902 — Versioned structured profile schema and persistence](https://github.com/eserlan/Codex-Cryptica/issues/1902)
2. [#1900 — AI control fidelity and evaluation harness](https://github.com/eserlan/Codex-Cryptica/issues/1900)
3. [#1901 — Shared structural validation, quality policies, and repair/regeneration](https://github.com/eserlan/Codex-Cryptica/issues/1901)
4. [#1903 — Single saved-language selector and context plumbing](https://github.com/eserlan/Codex-Cryptica/issues/1903)
5. [#1904 — Downstream generator consumption and adherence](https://github.com/eserlan/Codex-Cryptica/issues/1904)
6. [#1905 — Fallback contract hygiene and genre/marketing alignment](https://github.com/eserlan/Codex-Cryptica/issues/1905)

The schema comes first because prompt output, validation, persistence, rendering, and downstream consumption should all target the same canonical contract.

## Improvement Checklist

### Priority 0 — Establish the Canonical Structured Contract

- [ ] Define `LanguageGenerationResultV1` and `LanguageProfileV1` as the shared canonical contract.
- [ ] Explicitly distinguish universally required core fields from optional/enrichment fields.
- [ ] Version and persist `LanguageProfileV1` with `languageProfileVersion: 1`.
- [ ] Render readable `content` and `lore` from the profile.
- [ ] Make the renderer tolerate legitimately absent enrichment.
- [ ] Do not parse generated Markdown to reconstruct canonical rules.
- [ ] Require both AI and local generators to return the same V1 result type.
- [ ] Preserve a legacy compatibility path for existing readable-only language notes.

### Priority 0 — Strengthen AI Control Fidelity

- [ ] Tone shapes sound inventory, rhythm, phonotactics, and pronunciation guidance.
- [ ] Genre shapes vocabulary domains, linguistic history, loanwords, metaphors, and concepts.
- [ ] Role shapes register, formality, social restrictions, prestige/taboo, specialised vocabulary, and phrase use.
- [ ] Name structure shapes morphology and visibly different personal/place/title/lineage construction rules.
- [ ] World context grounds cultures, history, neighbours, institutions, technologies, religions, and geography where relevant.
- [ ] Custom values preserve user intent instead of normalising toward presets.
- [ ] Examples demonstrate selected rules rather than merely describing them.

### Priority 0 — Validate and Repair Output

- [ ] Use one shared parser/normalizer and structural runtime schema.
- [ ] Define separate AI-quality and fallback-quality policies without forking the canonical type.
- [ ] Validate AI-required detail, minimum collection sizes, and substantive enrichment.
- [ ] Validate fallback minimum data without demanding unavailable enrichment.
- [ ] Reject placeholder/fabricated fallback semantics added only to satisfy AI completeness.
- [ ] Detect duplicates and obvious internal contradictions where practical.
- [ ] Apply strict name safety to titles/example names and whole-collision-only policy to ordinary vocabulary.
- [ ] Use one targeted repair and one clean regeneration before local fallback.
- [ ] Never present partially valid output as success.

### Priority 1 — Improve Saved-Language Reuse

- [ ] Add an explicit Language Profile selector to relevant generators.
- [ ] Let users choose one primary profile.
- [ ] Make no selection mean no authoritative language profile.
- [ ] Rank optional suggestions by source relationship, category, and recent use, and require confirmation.
- [ ] Feed available structured naming, phonology, morphology, lexicon, phrase-pattern, and register rules into downstream AI prompts.
- [ ] Make downstream generators demonstrate adherence to the selected profile.
- [ ] Make downstream consumers tolerate absent optional enrichment.
- [ ] Define graceful behaviour for legacy readable-only language notes.
- [ ] Defer multiple-profile blending until interaction semantics are explicitly designed.

### Priority 2 — UX and Coverage

- [ ] Align language presets with theme-hub genres and marketing claims, or narrow the copy.
- [ ] Explain which controls affect AI generation and which are approximated by fallback.
- [ ] Preview example sounds or names where useful.
- [ ] Let users regenerate names, vocabulary, or phrases while preserving canonical profile rules.
- [ ] Add export and copy actions for glossary and naming rules.
- [ ] Surface the selected language profile in downstream generation context.

### Fallback Maintenance

- [ ] Fix clearly incorrect consonant/vowel classifications and obvious defects.
- [ ] Prevent duplicate glossary words and example names where inexpensive.
- [ ] Make fallback construct a structurally valid V1 result satisfying fallback-quality validation.
- [ ] Populate enrichment only where the local engine has honest, useful information.
- [ ] Make AI-only behaviour explicit.
- [ ] Do not expand fallback into a comprehensive procedural conlang engine without separate product justification.

### Testing

- [ ] Test V1 structural schema parsing, versioning, persistence, and round-trip behaviour.
- [ ] Test AI-quality and fallback-quality validation separately.
- [ ] Test that minimum fallback profiles can omit optional enrichment without synthetic filler.
- [ ] Test that rendered Markdown faithfully reflects structured profile data at both richness levels.
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
- [ ] AI and local generation use the same `LanguageGenerationResultV1` type and shared structural validation path.
- [ ] AI profiles pass the richer AI-quality policy; fallback profiles pass the minimum fallback-quality policy without fabricated enrichment.
- [ ] Human-readable language content is rendered from validated structured data rather than parsed into it.
- [ ] Tone, genre, role, name structure, custom values, and world context materially influence AI generation and are visible in structured rules and examples.
- [ ] Malformed AI responses follow the documented bounded repair/regeneration/fallback policy.
- [ ] Strict name checks cover language titles, example names, and direct derivatives; ordinary vocabulary uses whole-name collision checks only.
- [ ] Users can explicitly select one primary saved language profile for relevant downstream generation.
- [ ] No selection injects no authoritative saved-language rules.
- [ ] Downstream generators consume the selected profile, tolerate legitimately absent optional fields, and produce linguistically consistent names and terminology.
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

The crucial architectural step is to stop treating a language as generated prose with reusable hints. A CC language should be a **versioned structured worldbuilding asset**, with Markdown as its presentation.

One canonical type can serve both AI and fallback generation without pretending they have equal richness: shared structure, explicit quality policies, no fake filler.

Generate the language once, then let characters, settlements, factions, ships, dynasties, titles, religions, and other entities consistently inherit its linguistic identity.
