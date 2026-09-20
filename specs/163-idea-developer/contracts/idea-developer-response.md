# Contract: Model response

The model is asked for one JSON object (JSON mime type). The response is validated with `zod` in `packages/generator-engine/src/idea-developer/parse.ts` before anything is shown.

## Shape

Returned on every turn (full development each time).

```json
{
  "whatChanged": "string (required after the first turn, omitted on the first)",
  "alreadyInteresting": "string",
  "centralQuestion": "string",
  "makeItMove": "string",
  "peopleWhoCare": [
    {
      "name": "string",
      "role": "string",
      "wants": "string",
      "conflictsWith": "string"
    }
  ],
  "playerDirections": [{ "title": "string", "description": "string" }],
  "consequences": "string",
  "creatorQuestions": ["string"],
  "generatorSuggestions": [{ "generatorKey": "string", "reason": "string" }]
}
```

## Validation rules (deterministic)

| Rule                                                                                                                                                                                                     | Spec           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| All fields present and non-empty; `whatChanged` required on turns after the first and absent on the first                                                                                                | FR-003, FR-034 |
| `peopleWhoCare` at least 2 usable entries (each with non-empty `conflictsWith`); more than 4 are trimmed to the first 4                                                                                  | FR-006         |
| `playerDirections` at least 2 after dropping unusable and repeated titles (compared case-insensitively, trimmed)                                                                                         | FR-007         |
| `creatorQuestions` at least 2 non-empty; more than 4 are trimmed to the first 4                                                                                                                          | FR-008         |
| No key named `score`, `rating` or `grade` at any depth, and no text such as `n/10`, `n out of 10`, `score of n` or `rating: n`. (`rank` is an ordinary field; "3 out of 100 households" is not a rating) | FR-009         |
| `generatorKey` in the catalogue, otherwise dropped; top up to at least 2 from the default set; cap at 5                                                                                                  | FR-013, FR-015 |

## Failure handling

- Invalid JSON or a failed rule: retry the same turn once, using the same conversation. If it fails again, return a failure to the UI, which keeps the idea and offers a retry (FR-026).
- A response that says the input is not an RPG idea is represented by an explicit `needsRpgIdea: true` variant, not by sections; the UI asks for an RPG idea (FR-027).

## Not validated mechanically

Preservation of the original idea (FR-004) and quality of player directions (SC-004) are checked by manual review of the fixture corpus, plus prompt-level constraints and fixture tests that assert Assess does not add new factions.
