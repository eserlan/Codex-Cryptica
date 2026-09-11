/**
 * Faction Turn engine — pure resolution logic for faction turns.
 *
 * Library-first (Constitution I): no storage, no network, no DOM, and no Svelte
 * runes. Everything here operates on plain data passed in by the caller, which
 * is what keeps the five-band x reversibility test matrix cheap to run.
 *
 * State hashing stays local to this package so the engine remains rune-free and
 * production bundlers never need to resolve an unsupported deep import.
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
export * from "./hash";
export * from "./engine";
