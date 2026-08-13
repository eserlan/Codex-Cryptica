# Language Profiles

Codex Cryptica stores generated language rules as structured data. Markdown is
a readable projection of those rules, not a source that the app parses back
into a language model.

## V1 contract

`LanguageGenerationResultV1` is the boundary returned by AI and local
generation:

```ts
{
  version: 1;
  title: string;
  summary: string;
  labels: string[];
  profile: LanguageProfileV1;
}
```

`LanguageProfileV1` records the selected genre, tone, role, and naming
structure alongside:

- a required sound inventory and phonotactics;
- required example names with meanings and uses;
- a required glossary;
- required phrases with pronunciation and translation;
- the language register and table-use tips;
- optional cultural, pronunciation, morphology, naming-pattern, grammar, and
  social detail.
- optional machine-readable rules, morphemes, syllable analyses, structured
  naming patterns, and example components.

The optional fields are deliberate. AI is expected to provide a rich profile,
while the offline generator records only rules it can honestly produce.
Existing V1 data remains valid when the newer analysis fields are absent. The
AI quality policy, rather than the structural schema, requires those fields on
new AI output. Rule-reference fields are stored as arrays; the runtime boundary
normalizes a model's single string reference into a one-item array before
validation and persistence.

Saved language entities use:

```yaml
kind: language
languageProfileVersion: 1
languageProfile: ...
```

Existing `kind: language` notes without these fields remain readable legacy
languages. They are never upgraded by parsing their prose.

## Validation and recovery

Every producer passes through the same runtime structural schema. Source-aware
quality policies then apply:

- AI output requires at least 10 unique glossary words, four names, three
  phrases, two table tips, and substantive culture, sound, morphology, and
  naming guidance. It also requires:
  - stable IDs for rules, glossary entries, and morphemes;
  - declared major language rules, each visibly demonstrated by an example;
  - C/V syllable patterns and syllable analyses;
  - ordered structured naming patterns and component-derived names, including
    the language title itself;
  - structured prefix and suffix references to declared affix morphemes;
  - component-derived phrases with literal translations, construction types,
    and grammatical slots; and
  - at least three phrases that demonstrate syntax rather than standalone
    compounds or noun strings.
- Local output requires at least 10 unique glossary words, three names, two
  phrases, two table tips, and the recorded controls.

Consistency validation reports both blocking contradictions and advisory
quality gaps.

Blocking contradictions are repaired and may still cause local fallback:

- conflicting pronunciation, meaning, or part-of-speech declarations for the
  same normalized glossary word;
- undeclared or duplicate source, rule, and pattern IDs;
- components that change a declared source's form, pronunciation, or meaning
  without a cited productive rule;
- prefixes or suffixes with missing, mismatched, or root-only morpheme
  declarations, including affixes that contradict a zero-affixation claim;
- conflicting pronunciations for the same repeated form; and
- prohibited names, input-control drift, or malformed structured data.

Advisory gaps receive one targeted repair attempt but do not discard an
otherwise usable AI language:

- names and phrases whose visible surface or pronunciation is not fully
  accounted for by ordered components;
- meanings or translations containing unsupported semantic content;
- example names that do not follow the selected structure and ordered naming
  slots;
- roots, words, names, and compounds with syllables outside the declared sound
  inventory or C/V patterns;
- shared graphemes with conflicting pronunciations unless a demonstrated
  contextual phonology rule accounts for the variation;
- phrase examples that cite grammar rules without visibly demonstrating a
  syntactic relationship; and
- incomplete richness, derivation, syntax-demonstration, or rule-demonstration
  coverage.

AI recovery has a fixed budget:

1. Validate the initial result.
2. For advisory-only issues, make one repair request. Accept the last parseable
   AI result if only advisory issues remain.
3. For structural failures or blocking contradictions, allow up to two repair
   requests.
4. Use local fallback only when no structurally valid, non-contradictory AI
   result survives the repair flow.
5. Show a user-readable error if the local result is invalid.

Generated Markdown is never used as a repair source.

Language-profile requests use a lower-creativity JSON decoding configuration
and a larger output-token budget than other generators. This reduces
cross-field drift and prevents truncation of the large structured response
while retaining the same model, validation, and repair architecture.

Language creation is stateless even when interaction-backed generation is
enabled for other campaign generators. A new language request always sends the
complete resolved prompt and never treats the previous language response as a
draft to revise. Public generator session context also excludes prior language
drafts while retaining other generated campaign elements, so an earlier title
or summary is not supplied as continuity material. Repair requests include the
original resolved request, preserve unaffected valid fields, and make the
smallest changes needed for the reported issues. They recompute title or
summary only when validation specifically implicates those identity fields.

## Selection and downstream use

Character, faction, settlement, and ship generators can use one saved
**Naming language**. The empty selection means that no saved language is
authoritative. A language related to the source entity may be suggested, but
the user must select it before its rules are applied.

Structured selections contribute only populated sound, word-formation, naming,
glossary, phrase, and register guidance. An explicitly selected legacy
language contributes a bounded readable excerpt. Unselected detected languages
are not silently mixed into prompts.

When present, rule IDs, morphemes, structured naming slots, and component
analyses are included in downstream guidance so another generator can derive
new terms rather than imitate unexplained examples.

## AI evaluation

The repeatable evaluation matrix and threshold validator are exported from
`generator-engine` as `LANGUAGE_EVALUATION_CASES` and
`validateLanguageEvaluation`.

For every case:

1. Generate three independent samples.
2. Record the model ID, prompt version, schema version, ISO date, exact inputs,
   raw result, evaluator, scores, and any failure notes.
3. Score each criterion from 0–2:
   control fidelity, identity sensitivity, consistency, compositional
   consistency, rule demonstration, phonological compliance, grounding,
   completeness, presentation fidelity, reusability, and name safety.
4. Run `validateLanguageEvaluation(records)`.

A run passes only when every raw result satisfies structural and AI-quality
validation, every criterion is non-zero, every sample has a mean of at least
1.5, and every case has exactly three distinct samples. A fixed three-role
matrix also holds genre, tone, structure, and context constant while varying
only role; corresponding samples fail if they reuse a title or summary.

## Versioning

V1 data is read only when `languageProfileVersion` is `1`. Future incompatible
shapes must introduce a new wrapper/profile version and an explicit migration;
they must not reinterpret V1 fields in place. Unknown future versions should
remain preserved by storage where possible but must not be treated as a native
V1 profile until a migration exists.
