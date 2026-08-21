/**
 * Faction Turn engine — pure resolution logic for faction turns.
 *
 * Library-first (Constitution I): no storage, no network, no DOM, and no Svelte
 * runes. Everything here operates on plain data passed in by the caller, which
 * is what keeps the five-band x reversibility test matrix cheap to run.
 *
 * Note for maintainers: `entityContentHash` is deep-imported from
 * `@codex/oracle-engine/src/lore-delta`, never from that package's barrel. The
 * barrel re-exports `*.svelte.ts` modules, which would pull Svelte runes into a
 * package compiled and tested without the Svelte compiler.
 */
export * from "./types";
export * from "./bands";
export * from "./narrative";
export * from "./roles";
export * from "./eligibility";
export * from "./opposition";
export * from "./resolution";
export * from "./patches";
export * from "./history";
export * from "./engine";
