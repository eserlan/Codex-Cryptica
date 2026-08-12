# Quickstart: Plot Twist & Complication Generator

## Local development

```bash
git switch 2166-plot-twist-complication
bun install
```

Launch the web app and open the campaign generator HUD/modal. Select **Plot
Twist & Complication**, enter a premise, choose the dramatic controls, and run
with AI enabled or disabled to exercise the local fallback.

## Focused validation

```bash
bun --filter generator-engine test
bun --filter generator-engine lint
bun --filter web check
bun --filter web lint
```

The focused tests should prove:

- all required output headings are present;
- constraints and selected controls reach the prompt;
- supplied campaign context is preserved and treated as authoritative grounding;
- malformed AI JSON falls back safely;
- the registry exposes the generator and maps it to `note`.

## Manual acceptance

1. Generate from a standalone premise with no vault context.
2. Generate again with a selected source entity and connected entities.
3. Try a constraint such as `no resurrection` or `do not change the villain`.
4. Verify the result gives the players new choices, not only a surprise reveal.
5. Review the draft before saving it to the vault.
