# Research: Plot Twist & Complication Generator

## Decision: In-app campaign generator only for this slice

The issue explicitly requires a catalogue generator and context-aware campaign
use. It does not request a no-login public `/generators` page. Implement the
campaign surface now and leave SEO/public route enumeration for a follow-up.

**Rationale**: The two surfaces have separate contracts and wiring. Keeping the
scope to the campaign registry avoids duplicating route, metadata, and public
form work before the core generation behavior is validated.

**Alternatives considered**: Implementing both surfaces now would increase
surface area without being required by #2166; a generic inline registry prompt
would not provide the rich structured parsing and deterministic fallback the
feature needs.

## Decision: Reuse the rich structured generator pattern

Follow the existing Adventure/Dungeon pattern in
`packages/generator-engine/src/public-adventure.ts`: typed options, resolved
defaults, prompt builder, fenced-JSON parsing, and deterministic local output.
Expose the module through the campaign registry rather than placing prompt
logic in Svelte.

**Rationale**: This keeps the engine framework-free, makes malformed AI output
recoverable, and allows later Adventure/Quest/Dungeon integrations to reuse
the capability.

## Decision: Map generated drafts to `note`

The output is a reusable situation/complication document, not a character,
location, faction, or graph topology. Use the existing `note` category and
`mapOutputToDraft` path.

**Rationale**: It preserves existing save behavior and avoids inventing a new
entity type for a narrative tool.

## Decision: Put required playability headings in rich `content`

The AI and local fallback both produce Reveal, Believed Assumption, Rationale,
Foreshadowing, Immediate Consequences, and New Choices in the main document.
`summary` remains a concise description and `lore` can contain GM-facing
reference notes without changing the shared output contract.

**Rationale**: The existing draft/public adapter treats `content` as the rich
body and `lore` as the reference rail; this preserves the established document
layout semantics.

## Decision: Use generic campaign form controls

The current `GeneratorConfigForm.svelte` renders registry option definitions for
selects and textareas, so no feature-specific Svelte component is needed.

**Rationale**: It satisfies discoverability and accessibility with less custom
UI and avoids a second source of option defaults.

## Decision: Make continuity preservation a prompt invariant

The prompt must explicitly preserve supplied events/facts, locate an assumption
that can be reinterpreted, avoid arbitrary invalidation/cliché reveals, and
require new player choices.

**Rationale**: These are the product differentiators in #2166 and cannot be
reliably enforced by option labels alone. Regression tests should assert these
instructions are present.
