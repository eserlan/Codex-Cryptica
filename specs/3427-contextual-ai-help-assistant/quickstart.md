# Quickstart: Contextual AI Help Assistant (Spike)

## Run it locally

1. Build the knowledge bundle: `bun run --cwd packages/help-engine bundle` (writes the generated bundle the Worker imports; not committed).
2. Start the Worker: `bunx wrangler dev` in `apps/workers/oracle-proxy` (serves `:8787`; the session guard is skipped against a local proxy, as today). Provide a provider key via `.dev.vars` (`OPENAI_API_KEY` or `GEMINI_API_KEY`).
3. Start the app with the flag on: `VITE_HELP_ASSISTANT=true bun dev` in `apps/web`. In a development build you can instead turn it on for one browser with `localStorage.setItem("codex_help_assistant", "true")` and a reload (production builds ignore this).
4. Make sure AI is not disabled: Settings → AI → "AI Disabled" must be off (research F5). With it on, the Help panel must not appear.

## Verify the spike scenario (manual)

1. Open a vault, open a Settlement, go to the **Connections** tab.
2. Click **Ask about this** (or the persistent help button).
3. Ask: "How do I connect the faction I just created?"
4. Expect: a short answer saying to use **Add** on the **Status** tab, with sources (Connections Tab, Entity Connections).
5. Press **Show me**: the Status tab opens and the Add button is highlighted with a visible label. Press Escape to clear. Confirm no connection was created.
6. Ask "Can I export my vault to Roll20?" — expect an honest no-match with closest topics.
7. Go offline (devtools) and ask again — expect a plain message and a link to the Connections help topic.

## Inspect privacy

Open the network panel, select the `/api/help/ask` request: the body contains only `question`, `history`, and the screen description (`context`). There must be no entity names/IDs and no analytics requests from the help panel.

## Tests

Impacted-only, per repo rules:

- `bun scripts/test-changed.mjs` · `bun scripts/lint-changed.mjs`
- Scoped type-check: `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`, and the Worker/package checks via `bun scripts/affected-workspaces.mjs`.
- Evaluation harness (stubbed model, CI-safe): `bun run --cwd packages/help-engine eval`. Live model run (manual): `bun run --cwd packages/help-engine eval -- --live`.

## Where things live

| Concern                                                                   | Path                                                            |
| ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Context schema, registry, actions, retrieval, prompt, response validation | `packages/help-engine/`                                         |
| Worker route + metric line                                                | `apps/workers/oracle-proxy/src/help.ts`, `help-metrics.ts`      |
| Panel, stores, highlight service                                          | `apps/web/src/lib/{components,stores,services}/help-assistant/` |
| Contracts and findings                                                    | `specs/3427-contextual-ai-help-assistant/`                      |
