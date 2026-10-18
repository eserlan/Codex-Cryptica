# Complete contextual AI Help coverage

Issue: #3645. Builds on the behaviour and privacy contract in
`../3427-contextual-ai-help-assistant/spec.md` and the Phase A plan in
`../3615-help-registry-expansion/plan.md`; no separate behaviour specification is
needed for this coverage increment.

## Scope and acceptance

Register Session Journal, Entity Reports, Stat Sheets, entity templates,
Chronology, Family Tree, Guided Mode and Session Prep. Reuse existing visible
Help and fill only the Guided Mode / Session Prep prose gaps. Retain the five
non-mutating action types and the exact context key set. Recognise the journal
and report overlays, nested route templates and chronology. Offer Family only
for characters and tabs only where a tab strip exists. Suppress journal and
Settings guidance in guest mode. Explicit questions must work from misleading
screens; ambiguous questions and offline fallback must respect kind/tab context.
Track coverage decisions in a tested ledger and the existing PR template.

## Constitution check

- I/III: shared matching and registry logic stay in help-engine; web only reads
  existing stores and maps accepted actions. No new dependency or storage.
- II/X: failing registry/context/action tests first, then success and negative
  cases; changed-code tests and affected workspace checks only.
- V: closed enums and no new keys or vault content. The existing privacy tests
  remain the contract; opening a journal is not starting or writing one.
- VII/IX: shared Help, British English and plain workflow instructions.
- VIII: constructor-injected context/action sources retained.
- XIII: no discovery pages added or materially repositioned; only ordinary Help.
- XIV: bounded feature modules and one shared screen-matching helper; no new
  responsibility appended to files over the review trigger.

## Validation and rollout

Run help-engine tests and scoped TypeScript, web Help/context/action/content
tests, Worker Help trust-boundary tests, changed-file lint, web svelte-check,
Fallow and codex-review. Check the existing retrieval set and the new tune cases
before assessing the frozen new holdout. Record recall and limitations without
weakening thresholds. Deploy the rebuilt Worker before web because the context
and panel enum values are additions to a strict shared schema.
