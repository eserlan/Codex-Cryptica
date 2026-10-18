# Contract: `onboarding-journey-engine` public API

Framework-free. No DOM, Svelte, storage or network access. Every function is pure unless noted. Types are defined in [data-model.md](../data-model.md).

```ts
// Definitions
export const JOURNEYS: Readonly<Record<JourneyId, JourneyDefinition>>;
export function journeyForGoal(goal: Goal): JourneyDefinition;
export const JourneyDefinitionSchema: z.ZodType<JourneyDefinition>; // definitions are parsed at module load in tests

// Progress lifecycle
export function startJourney(
  def: JourneyDefinition,
  now: number,
): JourneyProgress;
export function resumeJourney(p: JourneyProgress, now: number): JourneyProgress; // exited → running, keeps completed/skipped
export function applyMilestone(
  p: JourneyProgress,
  def: JourneyDefinition,
  m: Milestone,
  ctx: { availableCategories: ReadonlySet<string> },
): JourneyProgress; // same reference when nothing changes
export function skipStep(
  p: JourneyProgress,
  def: JourneyDefinition,
): JourneyProgress; // skips `current`; no-op when `current` is already completed or skipped
export function backStep(
  p: JourneyProgress,
  def: JourneyDefinition,
): JourneyProgress; // viewing = the step before the displayed one, in definition order
export function returnToCurrent(p: JourneyProgress): JourneyProgress; // clears viewing
export function exitJourney(p: JourneyProgress): JourneyProgress;

// Reading
export function currentStep(
  p: JourneyProgress,
  def: JourneyDefinition,
): StepDefinition | null;
export function stepInstruction(
  step: StepDefinition,
  ctx: { availableCategories: ReadonlySet<string> },
): string; // anyEntryCopy fallback (R4)
export function stepPosition(
  p: JourneyProgress,
  def: JourneyDefinition,
): { index: number; total: number };

// Persistence shape (the caller does the storage I/O)
export function parseProgress(
  raw: unknown,
  def: JourneyDefinition,
): JourneyProgress | null; // validate + migrate, never throws
export function serializeProgress(p: JourneyProgress): string;
```

## Guarantees (each covered by a unit test)

1. `applyMilestone` ignores milestones with `at < startedAt` and any milestone while `outcome !== "running"`.
2. A step completes at most once. Applying the same milestone twice gives the same progress (idempotent).
3. Eligibility for `after` is judged on the state **before** the milestone (data model, rpg-gm note).
4. One milestone may complete several independent steps.
5. Category matching uses `ctx.availableCategories`. If none of a step's categories exist, any `entry-created` matches.
6. `skipStep`, `backStep`, `returnToCurrent` and `exitJourney` never add to `completed`. `backStep` on the first step in definition order is a no-op. `skipStep` while viewing a step that is already done changes nothing. `skipStep` on a not-done step adds it to `skipped` and clears `viewing`.
   6a. A completed step stays completed. Nothing in the engine reacts to entries being deleted.
7. When no step is left, `outcome` becomes `"finished"`.
8. `parseProgress` drops step ids the definition no longer has, clears a dangling `viewing`, discards unknown `schema` values and malformed input, and never throws.
9. `serializeProgress` output contains only the fields in data-model `JourneyProgress`. A test asserts the key set, which also guards SC-008.
10. Budgets (plan Performance Goals): applying one 100-entity batch of milestones takes < 16 ms, and the minified, gzipped `src/index.ts` bundle (excluding `help-engine` and `zod`) is < 10 KB. Both are checked by tests.
11. Every `JOURNEYS` entry passes `JourneyDefinitionSchema`: unique step ids, `after` references earlier steps only, `fallback` present on every step, `anyEntryCopy` present when categories are named, `showMe` passes `GuidanceActionSchema`, `quickPrompt` exists in `QUICK_PROMPT_SETS`, at most one `finish.next`.
