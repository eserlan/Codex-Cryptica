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
