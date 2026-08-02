import type { StatSheetTemplate, StatSheetTemplateField } from "schema";
import type {
  BlockNode,
  FieldReferenceNode,
  InlineNode,
  MissingFieldNode,
  PresentationAst,
} from "./ast";
import { resolveDisplayMode } from "./directives";
import { parseTemplate } from "./parse";
import type { PresentationTemplate } from "schema";

function validateFieldRef(
  node: FieldReferenceNode,
  fieldsById: Map<string, StatSheetTemplateField>,
): FieldReferenceNode | MissingFieldNode {
  const field = fieldsById.get(node.fieldId);
  if (!field) {
    const missing: MissingFieldNode = {
      type: "missing-field",
      fieldId: node.fieldId,
    };
    if (node.label) missing.label = node.label;
    return missing;
  }
  const requested = node.displayMode ?? node.requestedDisplayMode;
  const { mode } = resolveDisplayMode(field.type, requested);
  const resolved: FieldReferenceNode = {
    type: "field-reference",
    fieldId: node.fieldId,
    displayMode: mode,
  };
  if (node.label) resolved.label = node.label;
  return resolved;
}

function validateInline(
  nodes: InlineNode[],
  fieldsById: Map<string, StatSheetTemplateField>,
): InlineNode[] {
  return nodes.map((node) => {
    switch (node.type) {
      case "field-reference":
        return validateFieldRef(node, fieldsById);
      case "em":
      case "strong":
        return { ...node, children: validateInline(node.children, fieldsById) };
      case "link":
        return { ...node, children: validateInline(node.children, fieldsById) };
      default:
        return node;
    }
  });
}

function validateBlock(
  nodes: BlockNode[],
  fieldsById: Map<string, StatSheetTemplateField>,
): BlockNode[] {
  return nodes.map((node) => {
    switch (node.type) {
      case "heading":
      case "paragraph":
        return { ...node, children: validateInline(node.children, fieldsById) };
      case "list":
        return {
          ...node,
          items: node.items.map((item) => validateInline(item, fieldsById)),
        };
      case "table":
        return {
          ...node,
          header: node.header.map((cell) => validateInline(cell, fieldsById)),
          rows: node.rows.map((row) =>
            row.map((cell) => validateInline(cell, fieldsById)),
          ),
        };
      case "blockquote":
      case "section":
      case "group":
      case "card":
      case "row":
        return { ...node, children: validateBlock(node.children, fieldsById) };
      default:
        return node;
    }
  });
}

/**
 * Validates a parsed `PresentationAst` against a Stat Sheet schema
 * (contracts/presentation-engine-api.md). Always succeeds: unresolved
 * field references become `MissingFieldNode`s and unknown directives
 * were already tagged `UnknownDirectiveNode` during parsing — neither
 * disqualifies the template (see `isTemplateUsable`).
 */
export function validateAst(
  ast: PresentationAst,
  schema: StatSheetTemplate,
): PresentationAst {
  const fieldsById = new Map(schema.fields.map((f) => [f.id, f]));
  return validateBlock(ast, fieldsById);
}

/**
 * Single decision point for FR-010: whether an entity's Stat Sheet should
 * render via `<PresentationRenderer>` (this template) or fall back to the
 * standard `StatSheetView.svelte` renderer.
 */
export function isTemplateUsable(
  template: PresentationTemplate,
  schema: StatSheetTemplate | undefined,
): boolean {
  if (!schema) return false;
  if (schema.id !== template.schemaTemplateId) return false;
  const result = parseTemplate(template.source, template.formatVersion);
  return result.ok;
}
