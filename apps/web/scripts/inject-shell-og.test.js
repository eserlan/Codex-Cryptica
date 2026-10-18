import { describe, it, expect } from "vitest";
import {
  DEFAULT_SHELL_META,
  buildOgBlock,
  escapeAttribute,
  injectShellOg,
} from "./inject-shell-og.mjs";

const SHELL =
  '<!doctype html>\n<html>\n<head>\n\t<meta charset="utf-8" />\n</head>\n<body></body>\n</html>';

describe("escapeAttribute", () => {
  it("encodes the characters that would break a double-quoted attribute", () => {
    expect(escapeAttribute('Notes & "lore" <tags>')).toBe(
      "Notes &amp; &quot;lore&quot; &lt;tags&gt;",
    );
  });

  it("encodes & first so entities are not double-encoded", () => {
    expect(escapeAttribute("a & b")).toBe("a &amp; b");
    expect(escapeAttribute("&amp;")).toBe("&amp;amp;");
  });
});

describe("buildOgBlock", () => {
  it("escapes interpolated metadata rather than emitting it raw", () => {
    const block = buildOgBlock({
      ...DEFAULT_SHELL_META,
      title: 'Codex & Co "quoted"',
    });
    expect(block).toContain(
      '<meta property="og:title" content="Codex &amp; Co &quot;quoted&quot;" />',
    );
    expect(block).not.toContain('content="Codex & Co "quoted"" />');
  });

  it("emits both og: and twitter: tags", () => {
    const block = buildOgBlock();
    expect(block).toContain('property="og:image"');
    expect(block).toContain(
      'name="twitter:card" content="summary_large_image"',
    );
  });
});

describe("injectShellOg", () => {
  it("injects the block immediately before </head>", () => {
    const { status, html } = injectShellOg(SHELL);
    expect(status).toBe("injected");
    expect(html).toContain('property="og:image"');
    expect(html.indexOf('property="og:image"')).toBeLessThan(
      html.indexOf("</head>"),
    );
  });

  it("leaves the rest of the document untouched", () => {
    const { html } = injectShellOg(SHELL);
    expect(html).toContain('<meta charset="utf-8" />');
    expect(html).toContain("<body></body>");
  });

  it("is idempotent — a second pass makes no further changes", () => {
    const once = injectShellOg(SHELL).html;
    const twice = injectShellOg(once);
    expect(twice.status).toBe("already-present");
    expect(twice.html).toBe(once);
  });

  it("skips a document that already has a real og:image, so SSR tags are never duplicated", () => {
    const withRealTags = SHELL.replace(
      "</head>",
      '\t<meta property="og:image" content="https://example.test/specific.png" />\n</head>',
    );
    const { status, html } = injectShellOg(withRealTags);
    expect(status).toBe("already-present");
    expect(html).toBe(withRealTags);
    expect(html.match(/property="og:image"/g)).toHaveLength(1);
  });

  it("reports no-head instead of mangling a document without </head>", () => {
    const { status, html } = injectShellOg("<html><body>no head</body></html>");
    expect(status).toBe("no-head");
    expect(html).toBe("<html><body>no head</body></html>");
  });
});
