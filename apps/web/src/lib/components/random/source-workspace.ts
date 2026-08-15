import type { Diagnostic, RandomSource } from "random-source-engine";

/**
 * What `SourceWorkspace` hands its editor snippet (#2247).
 *
 * The workspace owns the list and every write; the editor only reports what
 * changed, which is what lets tables and decks share one shell.
 */
export interface EditorContext {
  source: RandomSource;
  diagnostics: Diagnostic[];
  onChange: (next: RandomSource) => void;
  /** Returns false when the workspace needs to ask the user first (FR-042). */
  onRename: (name: string) => boolean;
}
