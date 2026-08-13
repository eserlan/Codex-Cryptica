# Data Model: Plot Twist & Complication Generator

## PlotTwistGeneratorOptions

Transient input passed from the campaign form to the generator engine.

| Field             | Type        | Rules                                                                               |
| ----------------- | ----------- | ----------------------------------------------------------------------------------- |
| `premise`         | `string`    | Trimmed; required for a meaningful standalone result; safe fallback for blank input |
| `themeId`         | `string?`   | Existing CC theme id; defaults to `workspace`/resolved genre                        |
| `genre`           | `string?`   | Existing theme label when supplied; never invent a parallel vocabulary              |
| `twistType`       | `string?`   | Must resolve to the supported taxonomy or `Random`                                  |
| `impact`          | `string?`   | `Subtle`, `Significant`, or `Campaign-changing`                                     |
| `timing`          | `string?`   | `Early`, `Midpoint`, `Climax`, `Aftermath`, or `Any`                                |
| `foreshadowing`   | `string?`   | `Surprise me`, `Foreshadowable`, or `Already hinted`                                |
| `constraints`     | `string?`   | Optional user constraints/tropes to avoid                                           |
| `campaignContext` | `string?`   | Optional bounded context text for prompt construction                               |
| `avoidNames`      | `string[]?` | Existing title/name exclusions from vault context                                   |

## ResolvedPlotTwist

Internal normalized values used by both prompt and local fallback. Every enum
field has a supported default, and the resolved premise is never blank.

## PlotTwistOutput

Mapped to the existing `GeneratorOutput` contract:

- `title`: concise twist/complication title
- `summary`: one-sentence premise and dramatic change
- `content`: markdown with the six required playability headings
- `lore`: GM-facing rationale/notes if distinct from the main body
- `labels`: includes `plot-twist` and `complication` plus theme-safe labels

## Campaign draft relationship

`PlotTwistOutput` is passed through `mapOutputToDraft("plot-twist")` and becomes
a transient `GeneratedDraft` with `entityType: "note"`. It inherits source
entity, template, language, and suggested connection metadata from the existing
request. No new persistence schema is introduced.

## State and failure behavior

1. Form submits options and optional context.
2. Engine resolves defaults and builds prompt or local fallback.
3. AI response is parsed; malformed/partial output falls back to deterministic
   complete output.
4. The existing service handles cancellation/stale request semantics.
5. User reviews and explicitly saves through the existing draft flow.
