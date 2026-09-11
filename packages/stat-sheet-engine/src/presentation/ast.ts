import type { PresentationDisplayMode } from "./directives";

export interface InlineText {
  type: "text";
  text: string;
}

export interface InlineEmphasis {
  type: "em" | "strong";
  children: InlineNode[];
}

export interface InlineLink {
  type: "link";
  href: string;
  children: InlineNode[];
}

export interface FieldReferenceNode {
  type: "field-reference";
  fieldId: string;
  displayMode?: PresentationDisplayMode;
  /** Display mode requested by the author but incompatible with the field's
   * type; kept only for editor diagnostics, never used for rendering. */
  requestedDisplayMode?: PresentationDisplayMode;
  label?: string;
  hideLabel?: boolean;
}

/** A `FieldReference` whose `fieldId` does not resolve against the
 * declared schema (renamed/removed field). Non-fatal — rendered as a
 * visible flag (FR-009). */
export interface MissingFieldNode {
  type: "missing-field";
  fieldId: string;
  label?: string;
}

export type InlineNode =
  | InlineText
  | InlineEmphasis
  | InlineLink
  | FieldReferenceNode
  | MissingFieldNode;

export interface HeadingNode {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: InlineNode[];
}

export interface ParagraphNode {
  type: "paragraph";
  children: InlineNode[];
}

export interface ListNode {
  type: "list";
  ordered: boolean;
  items: InlineNode[][];
}

export interface TableNode {
  type: "table";
  header: InlineNode[][];
  rows: InlineNode[][][];
}

export interface BlockquoteNode {
  type: "blockquote";
  children: BlockNode[];
}

export interface ThematicBreakNode {
  type: "thematic-break";
}

export interface ImageNode {
  type: "image";
  src: string;
  alt: string;
}

export type LayoutDirectiveName = "stat-group" | "section" | "card" | "row";

export interface SectionNode {
  type: "section";
  /** A Markdown heading promoted to a collapsible section title. */
  heading?: HeadingNode;
  title?: string;
  children: BlockNode[];
}

export interface GroupNode {
  type: "group";
  columns?: number;
  children: BlockNode[];
}

export interface CardNode {
  type: "card";
  children: BlockNode[];
}

export interface RowNode {
  type: "row";
  children: BlockNode[];
}

/** A fenced `:::name ... :::` directive whose name is not in the v1
 * allowlist (directives.ts). Never executed, never dropped silently —
 * rendered as a visible flagged placeholder (FR-011). */
export interface UnknownDirectiveNode {
  type: "unknown-directive";
  name: string;
  raw: string;
}

export type BlockNode =
  | HeadingNode
  | ParagraphNode
  | ListNode
  | TableNode
  | BlockquoteNode
  | ThematicBreakNode
  | ImageNode
  | SectionNode
  | GroupNode
  | CardNode
  | RowNode
  | UnknownDirectiveNode;

export type PresentationAst = BlockNode[];

/** Container keys through which every BlockNode/InlineNode variant nests
 * further nodes (see the interfaces above). Kept in one place so consumers
 * that need to walk the presentation AST (editor diagnostics, override
 * hydration, etc.) share a single traversal contract instead of each
 * re-deriving this list and risking drift when a new variant is added. */
const PRESENTATION_NODE_CHILD_KEYS = [
  "children",
  "items",
  "header",
  "rows",
] as const;

/** Recursively visits every node in a parsed presentation AST (or any
 * subtree of it), including nested inline/block/table structures. */
export function walkPresentationNodes(
  nodes: unknown[],
  visit: (node: Record<string, unknown>) => void,
): void {
  for (const n of nodes) {
    const node = n as Record<string, unknown>;
    visit(node);
    for (const key of PRESENTATION_NODE_CHILD_KEYS) {
      const val = node[key];
      if (Array.isArray(val)) {
        walkPresentationNodes((val as unknown[]).flat(2), visit);
      }
    }
  }
}

/** Assigns each `SectionNode` a stable key based on its position in
 * document order (e.g. `"section-0"`, `"section-1"`, ...). `SectionNode`
 * carries no id of its own, so viewer-only state (collapse/expand, #2331)
 * that needs to key off a section must derive a key this way, by object
 * identity, from a fresh parse of the same source. */
export function computeSectionKeys(
  nodes: PresentationAst,
): Map<SectionNode, string> {
  const keys = new Map<SectionNode, string>();
  let counter = 0;
  walkPresentationNodes(nodes, (node) => {
    if (node.type === "section") {
      keys.set(node as unknown as SectionNode, `section-${counter++}`);
    }
  });
  return keys;
}
