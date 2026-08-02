import type { StatSheetField } from "schema";

/** Shared render context threaded through every node component
 * (PresentationRenderer.svelte and apps/web/.../nodes/*). */
export interface PresentationRenderContext {
  fields: StatSheetField[];
  readOnly: boolean;
  mode: "view" | "preview";
  onUpdateFieldValue: (
    fieldId: string,
    value: number | string | boolean | undefined,
  ) => void;
  onAdjustCounter: (field: StatSheetField, direction: 1 | -1) => void;
}
