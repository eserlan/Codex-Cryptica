import {
  PRESENTATION_TEMPLATE_FORMAT_VERSION,
  type StatSheetTemplate,
  type StatSheetField,
} from "schema";
import {
  parseTemplate,
  validateAst,
  walkPresentationNodes,
  computeSectionKeys,
} from "@codex/stat-sheet-engine";
import type {
  MissingFieldNode,
  UnknownDirectiveNode,
  FieldReferenceNode,
} from "@codex/stat-sheet-engine";
import type { PresentationRenderContext } from "./types";

export interface PresentationDiagnostics {
  missing: MissingFieldNode[];
  unknown: UnknownDirectiveNode[];
  mismatched: FieldReferenceNode[];
}

/** Editor-only sample data and scratch collapse state; never writes to an entity. */
export function createPresentationPreview(
  source: () => string,
  schema: () => StatSheetTemplate,
) {
  // Sample values for live preview (contract: preview mode reads through
  // the same field-value accessor as real rendering, just backed by
  // representative data instead of an entity — spec.md Assumptions).
  function sampleValueFor(field: StatSheetField): StatSheetField["value"] {
    switch (field.type) {
      case "counter":
        return field.max !== undefined ? Math.round(field.max * 0.6) : 5;
      case "number":
        return 10;
      case "text":
        return "Sample text";
      case "longtext":
        return "Sample notes go here.";
      case "dice":
        return 45;
      default:
        return undefined;
    }
  }
  const sampleFields = $derived<StatSheetField[]>(
    schema().fields.map((f) => ({ ...f, value: sampleValueFor(f) })),
  );

  const parsed = $derived(
    parseTemplate(source(), PRESENTATION_TEMPLATE_FORMAT_VERSION),
  );
  const previewAst = $derived(
    parsed.ok ? validateAst(parsed.ast, schema()) : null,
  );
  const previewSectionKeys = $derived(
    previewAst ? computeSectionKeys(previewAst) : new Map(),
  );
  // Collapse state in the editor preview is scratch-only: it doesn't
  // represent any real entity, so it's never persisted (#2331).
  let previewCollapsedSections = $state<Set<string>>(new Set());

  function collectDiagnostics(nodes: unknown[]): PresentationDiagnostics {
    const missing: MissingFieldNode[] = [];
    const unknown: UnknownDirectiveNode[] = [];
    const mismatched: FieldReferenceNode[] = [];
    walkPresentationNodes(nodes, (node) => {
      if (node.type === "missing-field")
        missing.push(node as unknown as MissingFieldNode);
      if (node.type === "unknown-directive")
        unknown.push(node as unknown as UnknownDirectiveNode);
      if (node.type === "field-reference" && node.requestedDisplayMode)
        mismatched.push(node as unknown as FieldReferenceNode);
    });
    return { missing, unknown, mismatched };
  }

  const diagnostics = $derived(
    previewAst
      ? collectDiagnostics(previewAst)
      : { missing: [], unknown: [], mismatched: [] },
  );

  const previewContext: PresentationRenderContext = {
    get fields() {
      return sampleFields;
    },
    readOnly: true,
    mode: "preview",
    get sectionKeys() {
      return previewSectionKeys;
    },
    isSectionCollapsed: (sectionKey) =>
      previewCollapsedSections.has(sectionKey),
    onToggleSection: (sectionKey) => {
      const next = new Set(previewCollapsedSections);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      previewCollapsedSections = next;
    },
    onUpdateFieldValue: () => {},
    onUpdateField: () => {},
    onAdjustCounter: () => {},
  };

  return {
    get ast() {
      return previewAst;
    },
    get diagnostics() {
      return diagnostics;
    },
    context: previewContext,
  };
}
