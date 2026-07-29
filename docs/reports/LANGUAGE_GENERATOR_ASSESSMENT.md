# Language Generator Assessment

**Assessment date:** 2026-07-29  
**Feature:** `141-language-generator`  
**Primary implementation:** `packages/generator-engine/src/public-language.ts`

## Executive Summary

The language generator is best understood as two paths behind one interface:

- The **AI path** is the primary product experience. It generates campaign-ready fictional language profiles with phonology, cultural usage, naming rules, vocabulary, phrases, and GM-facing guidance.
- The **local/offline path** is a lightweight fallback that produces stylistically related pseudo-language names and words when AI is unavailable.

The highest-value work is therefore not to turn the fallback into a full procedural conlang engine. It is to make the AI path more faithful to user choices, more internally consistent, structurally reusable, and easier for downstream generators to consume.

The current AI prompt is already strong, but validation is permissive and generated language profiles are stored primarily as readable Markdown. Saved languages can be rediscovered and injected into later AI prompts, but users cannot explicitly select which language should guide a generation and local downstream generators cannot consume language rules procedurally.

The recommended direction is:

1. Make genre, tone, role, name structure, and world context produce clearly observable differences in AI output.
2. Introduce shared runtime validation and repair/retry behaviour for AI responses.
3. Persist a compact structured language profile alongside readable content.
4. Add explicit saved-language selection and use those profiles as reusable generative context for names, places, factions, ships, titles, and related generators.
5. Keep the local generator as a reliable fallback with minimum contract quality, without expanding it into a full linguistic simulation.

## Product Priority

The **AI-generated language profile is the feature**. The local generator exists for graceful degradation.

Success should therefore be measured primarily by whether an AI-generated language:

- strongly reflects the selected controls and supplied world context;
- remains internally consistent across phonology, names, glossary, and phrases;
- can be validated before presentation;
- can be saved as reusable structured worldbuilding context;
- can guide later generation consistently across Codex Cryptica.

The offline path only needs to remain coherent, usable, and compatible with the same public output contract where practical.

## Configuration and Variation Surface

| Dimension | Choices | AI effect today | Product expectation |
| --- | ---: | --- | --- |
| Genre | 7 | Strong creative direction and genre vocabulary | Strongly shape concepts, historical development, register, loanwords, and vocabulary |
| Tone | 5 | Directs phonology, rhythm, and sound | Produce recognisably different sound systems and naming texture |
| Language role | 5 | Directs register, prestige, taboos, and usage | Materially affect vocabulary, social rules, register, phrases, and naming conventions |
| Name structure | 4 | Directs morphology and name construction | Produce visibly different name and word construction strategies |
| World context | Free text | Incorporated into the prompt | Strongly ground language history, speakers, concepts, names, and terminology in the user's world |
| Custom tone, role, or structure | Free text | Interpreted by AI | Preserve custom intent and validate that the output reflects it |
| Custom genre | In-app generator | Interpreted by AI | Preserve custom setting vocabulary and cultural logic |

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

## AI Generation Rules

The AI is currently instructed to answer four useful questions:

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

This is a solid baseline. The primary weakness is not lack of prompt breadth; it is that the system does not yet verify that the model actually honoured the requested contract or persist the underlying language rules in a reusable form.

## AI Path Gaps and Risks

1. **Control fidelity is prompt-driven but not verified.** The prompt mentions genre, tone, role, structure, and context, but the system does not test whether each produced a material difference.
2. **World context is valuable but under-leveraged structurally.** It reaches the model, but there is no explicit requirement to derive culturally specific terminology, historical influences, loanwords, or naming rules from it.
3. **Response validation is permissive.** Missing or malformed fields can fall through to generic defaults rather than triggering repair or regeneration.
4. **Output shape is mostly presentation-oriented.** Phonology, morphology, naming rules, glossary entries, and register are embedded in Markdown rather than persisted as structured data.
5. **Internal consistency is requested but not validated.** Names, glossary words, phrases, and stated rules may contradict each other without detection.
6. **Banned-name enforcement is partial.** The in-app pipeline checks the title but not example names, roots, glossary words, phrases, or obvious derivatives.
7. **Saved-language choice is implicit.** Up to five detected profiles are automatically added to generator context; users cannot explicitly select the language that should guide a particular generation.
8. **Downstream reuse is prompt-only.** Other AI generators can receive saved language context, but there is no stable structured contract for consuming phonology, morphology, naming, glossary, or register data.
9. **Marketing breadth exceeds supported presets.** The page mentions or the wider product supports themes such as cosmic horror, western, steampunk, Lancer, and optimistic exploration sci-fi that are not selectable here.

## Structured Language Profile

A generated language should become a reusable worldbuilding asset rather than only a formatted lore note.

The AI response should include, or be transformed into, a compact structured profile alongside the readable `content` and `lore` fields. The exact schema can evolve, but it should cover the concepts downstream generators actually need.

Illustrative shape:

```json
{
  "phonology": {
    "sounds": [],
    "rhythm": "",
    "pronunciationRules": []
  },
  "morphology": {
    "wordFormation": [],
    "prefixes": [],
    "suffixes": [],
    "compounding": ""
  },
  "naming": {
    "personalNames": [],
    "placeNames": [],
    "titles": [],
    "lineages": []
  },
  "lexicon": [],
  "grammar": {
    "phrasePatterns": [],
    "functionWords": []
  },
  "register": {
    "role": "",
    "formality": "",
    "socialRules": []
  }
}
```

The goal is not linguistic completeness. The goal is enough structured information for later generation to reliably sound like the same language.

For example, once a language is saved, CC should be able to use it when generating:

- character names;
- settlement and region names;
- faction names;
- dynasties and lineages;
- ships and vehicles;
- titles and offices;
- religious terms;
- organisations and institutions;
- culturally specific vocabulary.

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

The missing UX is an explicit **Naming Language / Language Profile** selector. Relevant generators should allow the user to choose the saved language that should guide generation rather than relying on whichever profiles happen to be detected first.

Automatic suggestions can still exist, ideally ranked by source relationship, category, and recent use, but they should not replace explicit choice.

## Local / Offline Fallback

The local path currently uses five tone-based sound tables and combines spelling fragments through simple C/V patterns. Genre contributes one glossary concept, while role, structure, and context have little or no procedural effect.

This is acceptable as a fallback provided expectations are clear.

The fallback should **not** become a full conlang engine unless future product evidence justifies that investment. In particular, the project does not currently need a comprehensive local phonology, orthography, morphology, grammar, stress, inflection, and loanword simulation merely to match AI behaviour.

Minimum fallback goals:

- never crash when AI is unavailable;
- produce coherent names and vocabulary with reasonable uniqueness;
- satisfy the minimum public output shape;
- avoid obviously broken sound-table classifications;
- make selected structure/role visible where inexpensive and useful;
- clearly communicate controls or context that are AI-only, where applicable;
- preserve compatibility with saved `kind: language` entities.

Local enhancements should be judged by fallback quality and implementation cost, not by parity with the AI path.

## Strengths

- The AI prompt clearly defines useful, game-focused output.
- Genre direction is concrete and avoids reducing genre to surface labels.
- Content and compact GM-reference lore are separated for presentation and merged for vault storage.
- AI failure and malformed output can degrade to local generation.
- Generated profiles use the repository’s unified label terminology.
- Saved profiles are automatically rediscovered and supplied to other AI generators.
- The implementation follows the library-first and client-side principles in the project constitution.
- The public Svelte form uses runes, semantic theme tokens, accessible labels, help text, and Iconify utility classes.

## Improvement Checklist

### Priority 0 — Strengthen AI Control Fidelity

- [ ] Make each input dimension explicitly shape a distinct part of the generated language:
  - [ ] Tone → sound inventory, rhythm, phonotactics, and pronunciation guidance.
  - [ ] Genre → vocabulary domains, linguistic history, loanwords, metaphors, and culturally specific concepts.
  - [ ] Role → register, formality, social restrictions, prestige/taboo, specialised vocabulary, and phrase usage.
  - [ ] Name structure → morphology and visibly different personal/place/title construction rules.
  - [ ] World context → named cultures, history, neighbouring peoples, institutions, technologies, religions, geography, and other supplied lore where relevant.
- [ ] Explicitly tell the model to make the selected dimensions observable in examples, not merely describe them.
- [ ] Require sample names, glossary words, and phrases to demonstrate the selected naming and morphology rules.
- [ ] Preserve strong custom tone, role, structure, and genre intent rather than normalising it toward preset defaults.

### Priority 0 — Validate and Repair AI Output

- [ ] Introduce a shared runtime schema for language output.
- [ ] Require non-empty `title`, `summary`, `content`, and `lore`.
- [ ] Validate all required sections.
- [ ] Validate glossary row counts and required fields.
- [ ] Validate example-name and phrase counts.
- [ ] Validate pronunciation presence where required.
- [ ] Reject, repair, or regenerate malformed AI output before presenting it.
- [ ] Use the same parser and validation rules in the public and in-app generation paths.
- [ ] Check banned names across titles, example names, roots, glossary words, phrases, and direct derivatives.
- [ ] Add lightweight consistency checks where practical, especially for duplicate names/words and failure to demonstrate the selected name structure.

### Priority 1 — Persist Structured Language Rules

- [ ] Define a compact structured language-profile schema covering phonology, morphology, naming, lexicon, phrase/grammar patterns, and register.
- [ ] Have AI generation return structured data directly or derive it deterministically from a validated response.
- [ ] Store structured language data alongside readable Markdown.
- [ ] Keep the structured schema intentionally game-focused rather than attempting complete linguistic modelling.
- [ ] Preserve backwards compatibility for existing `kind: language` notes that contain only readable content.

### Priority 1 — Improve Saved-Language Reuse

- [ ] Add an explicit Naming Language / Language Profile selector to relevant generators.
- [ ] Let users choose one or more profiles instead of automatically relying on the first five detected profiles.
- [ ] Rank automatic suggestions by source relationship, category, and recent use.
- [ ] Feed structured naming, phonology, morphology, glossary, and register rules into downstream AI prompts.
- [ ] Make downstream generators demonstrate adherence to the selected language profile in their output.
- [ ] Define graceful behaviour for legacy saved languages without structured profile data.

### Priority 2 — UX and Coverage

- [ ] Align supported language presets with theme-hub genres and marketing claims, or narrow the copy.
- [ ] Explain which controls affect AI generation and which, if any, are only approximated by the fallback.
- [ ] Preview example sounds or example names before generation where useful.
- [ ] Let users regenerate only names, vocabulary, or phrases while preserving the language profile.
- [ ] Add export and copy actions for glossary and naming rules.
- [ ] Surface the selected language profile in downstream generation context.

### Fallback Maintenance — Keep It Reliable, Not Feature-Equivalent

- [ ] Fix clearly incorrect consonant/vowel classifications and other obvious fallback defects.
- [ ] Prevent duplicate glossary words and example names where inexpensive.
- [ ] Ensure the fallback satisfies the minimum output contract.
- [ ] Make AI-only behaviour explicit instead of silently implying full offline parity.
- [ ] Do not expand the fallback into a comprehensive procedural conlang engine without separate product justification.

### Testing

- [ ] Test that AI prompts encode genre, tone, role, structure, and world context distinctly.
- [ ] Add fixture-based tests showing materially different prompt guidance across preset dimensions.
- [ ] Test runtime rejection, repair, or regeneration of missing sections and malformed glossary data.
- [ ] Test banned-name collisions in titles, example names, vocabulary, phrases, and derivatives.
- [ ] Test duplicate-name and duplicate-word handling.
- [ ] Test structured profile parsing/storage and backwards compatibility.
- [ ] Test explicit saved-language selection and downstream context injection.
- [ ] Test that legacy `kind: language` notes remain usable.
- [ ] Add public-form integration tests for standard, custom, surprise, AI-fallback, and local-only flows.
- [ ] Keep deterministic fallback tests focused on stability and minimum contract quality rather than exhaustive linguistic variation.

## Definition of Done

The AI-first improvement is complete when:

- [ ] Tone, genre, role, name structure, and world context each materially influence AI generation and are visible in produced examples.
- [ ] AI output is validated and malformed responses are repaired, regenerated, or rejected consistently across public and in-app paths.
- [ ] Generated languages persist a reusable structured profile alongside readable lore.
- [ ] Banned-name checks cover the title, examples, glossary roots/words, phrases, and direct derivatives.
- [ ] Users can explicitly select which saved language profile guides relevant downstream generation.
- [ ] Downstream AI generators can consume the selected profile's naming, sound, morphology, vocabulary, and register rules.
- [ ] Existing `kind: language` notes remain compatible.
- [ ] The local generator remains a reliable fallback without requiring feature parity with AI.

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

The strategic opportunity is to turn a generated language into a reusable part of the world's generative context: generate a language once, then let characters, settlements, factions, ships, dynasties, titles, and other entities consistently inherit its linguistic identity.