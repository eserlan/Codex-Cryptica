import type { EffectiveValue, SectionNode } from "@codex/stat-sheet-engine";
import type { StatSheetField } from "schema";

/** Shared render context threaded through every node component
 * (PresentationRenderer.svelte and apps/web/.../nodes/*). */
export interface PresentationRenderContext {
  fields: StatSheetField[];
  readOnly: boolean;
  /** The entity this sheet belongs to. Needed to record a trade (#3963). */
  entityId?: string;
  mode: "view" | "preview";
  /** Species/ancestry effective values by field id; base values stay in `fields`. */
  effectiveValues?: Map<string, EffectiveValue>;
  onUpdateFieldValue: (
    fieldId: string,
    value: number | string | boolean | undefined,
  ) => void;
  onUpdateField: (fieldId: string, updates: Partial<StatSheetField>) => void;
  onAdjustCounter: (field: StatSheetField, direction: 1 | -1) => void;
  /** Section identity (by object reference, from `computeSectionKeys`) ->
   * stable key, used to key collapse/expand viewer state (#2331). */
  sectionKeys: Map<SectionNode, string>;
  isSectionCollapsed: (sectionKey: string) => boolean;
  onToggleSection: (sectionKey: string) => void;
}
