import { Marked, type Token, type Tokens, type TokensList } from "marked";
import type {
  BlockNode,
  CardNode,
  FieldReferenceNode,
  GroupNode,
  HeadingNode,
  InlineNode,
  PresentationAst,
  RowNode,
  SectionNode,
  UnknownDirectiveNode,
} from "./ast";
import {
  isAllowedLayoutDirective,
  isPresentationDisplayMode,
} from "./directives";

export interface ParseError {
  message: string;
}

export type ParseResult =
  { ok: true; ast: PresentationAst } | { ok: false; errors: ParseError[] };

// Mirrors apps/web/src/lib/utils/markdown.ts's ALLOWED_URI_REGEXP so links
// and images authored in a presentation template are held to the same
// safe-scheme allowlist as the rest of the app's Markdown rendering.
const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto|tel|data|blob):|[^&#?./]?(?:[#/?]|$))/i;

function isSafeUri(href: string): boolean {
  return ALLOWED_URI_REGEXP.test(href);
}

interface DirectiveToken extends Tokens.Generic {
  type: "directive";
  name: string;
  attrs: Record<string, string>;
  tokens: Token[];
}

interface FieldRefToken extends Tokens.Generic {
  type: "fieldRef";
  fieldId: string;
  displayMode?: string;
  label?: string;
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z][\w-]*)(?:=(?:"([^"]*)"|(\S+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    attrs[m[1]] = m[2] ?? m[3] ?? "true";
  }
  return attrs;
}

/** Finds the line index (within `lines`, starting search at `fromIndex`)
 * of the `:::` fence that closes the directive opened at `fromIndex - 1`,
 * accounting for nested `:::name` directives by depth-counting. Returns
 * -1 if unterminated. */
function findClosingFenceLine(lines: string[], fromIndex: number): number {
  let depth = 1;
  for (let i = fromIndex; i < lines.length; i++) {
    const line = lines[i];
    if (/^:::[a-zA-Z]/.test(line)) {
      depth++;
    } else if (line.trim() === ":::") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const directiveExtension = {
  name: "directive",
  level: "block" as const,
  start(src: string): number | undefined {
    const idx = src.indexOf(":::");
    return idx === -1 ? undefined : idx;
  },
  tokenizer(
    this: {
      lexer: { blockTokens: (src: string, tokens?: Token[]) => Token[] };
    },
    src: string,
  ) {
    const openMatch = /^:::([a-zA-Z][\w-]*)([^\n]*)\n/.exec(src);
    if (!openMatch) return undefined;
    const [openLine, name, attrsRaw] = openMatch;
    const rest = src.slice(openLine.length);
    const lines = rest.split("\n");
    const closeLine = findClosingFenceLine(lines, 0);
    if (closeLine === -1) return undefined; // unterminated: contained, fall through to normal parsing
    const innerSrc = lines.slice(0, closeLine).join("\n");
    const consumedLines = lines.slice(0, closeLine + 1).join("\n");
    const raw = openLine + consumedLines;
    const innerTokens = this.lexer.blockTokens(innerSrc, []);
    const token: DirectiveToken = {
      type: "directive",
      raw,
      name,
      attrs: parseAttrs(attrsRaw),
      tokens: innerTokens,
    };
    return token;
  },
};

const fieldRefExtension = {
  name: "fieldRef",
  level: "inline" as const,
  start(src: string): number | undefined {
    const idx1 = src.indexOf("{{stat.");
    const idx2 = src.indexOf("[");
    if (idx1 === -1) return idx2 === -1 ? undefined : idx2;
    if (idx2 === -1) return idx1;
    return Math.min(idx1, idx2);
  },
  tokenizer(src: string) {
    const mustacheMatch =
      /^\{\{stat\.([a-zA-Z0-9_-]+)((?:\s+[a-zA-Z0-9_-]+(?:="[^"]*"|=\S+)?)*)\s*\}\}/.exec(
        src,
      );
    if (mustacheMatch) {
      const [raw, fieldId, attrsRaw] = mustacheMatch;
      const attrs = parseAttrs(attrsRaw);
      const token: FieldRefToken = {
        type: "fieldRef",
        raw,
        fieldId,
        displayMode: attrs.display,
        label: attrs.label,
        hideLabel:
          attrs["hide-label"] === "true" ||
          attrs["hidelabel"] === "true" ||
          attrs["hide_label"] === "true",
      };
      return token;
    }
    const bracketMatch =
      /^\[([a-zA-Z0-9_-]+)(?::([a-zA-Z0-9_-]+))?\](?!\s*\(.*\))/.exec(src);
    if (bracketMatch) {
      const [raw, fieldId, displayMode] = bracketMatch;
      const token: FieldRefToken = {
        type: "fieldRef",
        raw,
        fieldId,
        displayMode,
      };
      return token;
    }
    return undefined;
  },
};

let sharedMarked: Marked | undefined;
function getMarkedInstance(): Marked {
  if (!sharedMarked) {
    sharedMarked = new Marked({
      extensions: [directiveExtension, fieldRefExtension],
    });
  }
  return sharedMarked;
}

function walkInline(tokens: Token[] | undefined): InlineNode[] {
  if (!tokens) return [];
  const out: InlineNode[] = [];
  for (const tok of tokens) {
    switch (tok.type) {
      case "text":
      case "escape":
        out.push({ type: "text", text: (tok as Tokens.Text).text });
        break;
      case "strong":
        out.push({
          type: "strong",
          children: walkInline((tok as Tokens.Strong).tokens),
        });
        break;
      case "em":
        out.push({
          type: "em",
          children: walkInline((tok as Tokens.Em).tokens),
        });
        break;
      case "link": {
        const link = tok as Tokens.Link;
        if (isSafeUri(link.href)) {
          out.push({
            type: "link",
            href: link.href,
            children: walkInline(link.tokens),
          });
        } else {
          // Unsafe scheme: degrade to plain text rather than dropping content.
          out.push(...walkInline(link.tokens));
        }
        break;
      }
      case "fieldRef": {
        const ref = tok as FieldRefToken;
        const node: FieldReferenceNode = {
          type: "field-reference",
          fieldId: ref.fieldId,
        };
        if (ref.label) node.label = ref.label;
        if (ref.hideLabel) node.hideLabel = true;
        if (ref.displayMode && isPresentationDisplayMode(ref.displayMode)) {
          node.displayMode = ref.displayMode;
        } else if (ref.displayMode) {
          node.requestedDisplayMode = ref.displayMode as never;
        }
        out.push(node);
        break;
      }
      // 'html' (raw inline HTML) and 'image' (handled at block level for
      // standalone images; dropped when mixed inline — see research.md §3)
      // are intentionally never passed through here (FR-004).
      case "html":
      case "image":
        break;
      default:
        // Any other inline token (codespan, br, del, ...): fall back to its
        // raw text content rather than dropping it silently.
        if (
          "text" in tok &&
          typeof (tok as { text?: unknown }).text === "string"
        ) {
          out.push({ type: "text", text: (tok as { text: string }).text });
        }
    }
  }
  return out;
}

function directiveNode(tok: DirectiveToken): BlockNode {
  const { name, attrs } = tok;
  const children = walkBlock(tok.tokens);
  if (!isAllowedLayoutDirective(name)) {
    const unknown: UnknownDirectiveNode = {
      type: "unknown-directive",
      name,
      raw: tok.raw,
    };
    return unknown;
  }
  switch (name) {
    case "stat-group": {
      const node: GroupNode = { type: "group", children };
      const columns = Number.parseInt(attrs.columns ?? "", 10);
      if (Number.isFinite(columns) && columns > 0) node.columns = columns;
      return node;
    }
    case "row": {
      const node: RowNode = { type: "row", children };
      return node;
    }
    case "card": {
      const node: CardNode = { type: "card", children };
      return node;
    }
    case "section": {
      const node: SectionNode = { type: "section", children };
      if (attrs.title) node.title = attrs.title;
      return node;
    }
  }
}

function walkBlock(tokens: Token[]): BlockNode[] {
  const out: BlockNode[] = [];
  for (const tok of tokens) {
    switch (tok.type) {
      case "heading": {
        const h = tok as Tokens.Heading;
        const node: HeadingNode = {
          type: "heading",
          level: Math.min(6, Math.max(1, h.depth)) as HeadingNode["level"],
          children: walkInline(h.tokens),
        };
        out.push(node);
        break;
      }
      case "paragraph": {
        const p = tok as Tokens.Paragraph;
        // A paragraph whose sole content is an image is promoted to a
        // standalone block-level image node (data-model.md ImageNode).
        if (p.tokens.length === 1 && p.tokens[0].type === "image") {
          const img = p.tokens[0] as Tokens.Image;
          if (isSafeUri(img.href)) {
            out.push({ type: "image", src: img.href, alt: img.text ?? "" });
            break;
          }
        }
        out.push({ type: "paragraph", children: walkInline(p.tokens) });
        break;
      }
      case "list": {
        const l = tok as Tokens.List;
        out.push({
          type: "list",
          ordered: l.ordered,
          items: l.items.map((item) => walkInline(item.tokens)),
        });
        break;
      }
      case "table": {
        const t = tok as Tokens.Table;
        out.push({
          type: "table",
          header: t.header.map((cell) => walkInline(cell.tokens)),
          rows: t.rows.map((row) => row.map((cell) => walkInline(cell.tokens))),
        });
        break;
      }
      case "blockquote": {
        const b = tok as Tokens.Blockquote;
        out.push({ type: "blockquote", children: walkBlock(b.tokens) });
        break;
      }
      case "hr":
        out.push({ type: "thematic-break" });
        break;
      case "directive":
        out.push(directiveNode(tok as DirectiveToken));
        break;
      case "space":
        break;
      // Raw block HTML is never passed through (FR-004).
      case "html":
        break;
      default:
        break;
    }
  }
  return out;
}

const SCRIPT_BLOCK_REGEXP = /<script[^>]*>[\s\S]*?<\/script\s*>/gi;
const HTML_TAG_REGEXP = /<\/?[a-zA-Z!][^>]*>/g;
const EXPRESSION_REGEXP = /\$\{[^}]*\}/g;
const HANDLEBARS_REGEXP = /\{\{[^}]*\}\}/g;
// Mirrors fieldRefExtension's tokenizer regexp above, anchored full-match:
// the only `{{...}}` form this contract allows through (directive-syntax.md).
const VALID_FIELD_REF_REGEXP =
  /^\{\{stat\.[a-zA-Z0-9_-]+((?:\s+[a-zA-Z0-9_-]+(?:="[^"]*"|=\S+)?)*)\s*\}\}$/;

export interface SanitizeResult {
  source: string;
  /** Raw text of every stripped fragment, in source order, for user-facing
   * "N items removed on import" messaging (FR-015/Validation Rules). */
  removed: string[];
}

/**
 * Strips disallowed content (raw HTML/`<script>`, `${...}`-style executable
 * expressions, any `{{...}}` form other than the flat `{{stat.field}}`
 * binding) directly from the raw Markdown source string, reporting what was
 * removed. Complements `parseTemplate`'s AST-level containment (which never
 * *emits* this content) by sanitizing the durable `source` itself before it
 * is persisted via import (package.ts) — never rejects the whole input,
 * only strips and reports (data-model.md Validation Rules).
 */
export function sanitizeSource(source: string): SanitizeResult {
  const removed: string[] = [];
  let out = source.replace(SCRIPT_BLOCK_REGEXP, (m) => {
    removed.push(m);
    return "";
  });
  out = out.replace(HTML_TAG_REGEXP, (m) => {
    removed.push(m);
    return "";
  });
  out = out.replace(EXPRESSION_REGEXP, (m) => {
    removed.push(m);
    return "";
  });
  out = out.replace(HANDLEBARS_REGEXP, (m) => {
    if (VALID_FIELD_REF_REGEXP.test(m)) return m;
    removed.push(m);
    return "";
  });
  return { source: out, removed };
}

/**
 * Parses extended-Markdown `source` into a `PresentationAst`
 * (contracts/presentation-engine-api.md). Pure, headless, and never throws
 * for any string input — malformed/unterminated directive fences are
 * contained to that block (fall through to normal Markdown parsing)
 * rather than failing the whole parse.
 */
export function parseTemplate(
  source: string,
  _formatVersion: number,
): ParseResult {
  try {
    const marked = getMarkedInstance();
    const tokens = marked.lexer(source) as TokensList;
    return { ok: true, ast: walkBlock(tokens) };
  } catch (e) {
    return {
      ok: false,
      errors: [{ message: e instanceof Error ? e.message : String(e) }],
    };
  }
}
