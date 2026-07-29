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

The optional fields are deliberate. AI is expected to provide a rich profile,
while the offline generator records only rules it can honestly produce.

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
  naming guidance.
- Local output requires at least 10 unique glossary words, three names, two
  phrases, two table tips, and the recorded controls.

Titles and example names reject prohibited names and direct derivatives.
Ordinary vocabulary rejects exact whole-name collisions only.

AI recovery has a fixed budget:

1. Validate the initial result.
2. Make one repair request containing the validation errors.
3. Make one clean regeneration request.
4. Produce and validate one local result.
5. Show a user-readable error if the local result is invalid.

Generated Markdown is never used as a repair source.

## Selection and downstream use

Character, faction, settlement, and ship generators can use one saved
**Naming language**. The empty selection means that no saved language is
authoritative. A language related to the source entity may be suggested, but
the user must select it before its rules are applied.

Structured selections contribute only populated sound, word-formation, naming,
glossary, phrase, and register guidance. An explicitly selected legacy
language contributes a bounded readable excerpt. Unselected detected languages
are not silently mixed into prompts.

## AI evaluation

The repeatable evaluation matrix and threshold validator are exported from
`generator-engine` as `LANGUAGE_EVALUATION_CASES` and
`validateLanguageEvaluation`.

For every case:

1. Generate three independent samples.
2. Record the model ID, prompt version, schema version, ISO date, exact inputs,
   raw result, evaluator, scores, and any failure notes.
3. Score each criterion from 0–2:
   control fidelity, consistency, grounding, completeness, presentation
   fidelity, reusability, and name safety.
4. Run `validateLanguageEvaluation(records)`.

A run passes only when every raw result satisfies structural and AI-quality
validation, every criterion is non-zero, every sample has a mean of at least
1.5, and every case has exactly three distinct samples.

## Versioning

V1 data is read only when `languageProfileVersion` is `1`. Future incompatible
shapes must introduce a new wrapper/profile version and an explicit migration;
they must not reinterpret V1 fields in place. Unknown future versions should
remain preserved by storage where possible but must not be treated as a native
V1 profile until a migration exists.
