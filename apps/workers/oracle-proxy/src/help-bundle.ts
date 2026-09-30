/**
 * The contextual-help knowledge bundle, generated at build time from the
 * feature registry and the in-app help articles
 * (`bun run --cwd packages/help-engine bundle`). It is not committed.
 *
 * Kept in its own module and loaded lazily by `help.ts`, so nothing else in
 * the Worker (or its tests) needs the generated file to exist.
 */
import type { KnowledgeBundle } from "../../../../packages/help-engine/src";
import bundle from "../../../../packages/help-engine/dist/knowledge-bundle.json";

export const helpBundle = bundle as unknown as KnowledgeBundle;
