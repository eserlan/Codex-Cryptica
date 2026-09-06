# Heist generation quality

The heist's objective transition, detection and full success condition must agree
across generation, review and local fallback. Public and campaign generation must
use the same two-pass workflow, including when structural validation passes.

## Implementation

- Align Pass 1 with the five-state review model; keep discovery and route closure
  conditional on their actual triggers. Request the same JSON fields everywhere.
- Put two-pass orchestration and repair acceptance in a framework-free package
  module. Keep a usable original on failed or structurally worse review; accept
  semantic corrections with unchanged structural findings.
- Adapt both public and campaign generation to that module. Preserve campaign
  grounding, name constraints and cancellation, and retain complete heists on save.
- Make local fallback discovery, clocks, hidden factors and escape options concrete.
- Exercise the same workflow in the evaluation harness and retain semantic cases
  for manual/live review; do not call structural compliance a semantic quality score.

## Constitution check

Library-first: shared orchestration belongs in `packages/generator-engine`.
No new dependencies, persistence or data recipients. Existing AI opt-in applies.
Tests cover successful review, semantic-only edits, malformed output, failure and
cancellation. Existing large modules only receive adapters or corrections to
their existing responsibility; new heist orchestration has its own module.
No new or repositioned discovery page.

## Verification

Run targeted generator, campaign, public-service and evaluation tests, the local
evaluation sweep, lint and type checks. Review live fixtures separately from
deterministic test results. Record the completed checks at handoff.
