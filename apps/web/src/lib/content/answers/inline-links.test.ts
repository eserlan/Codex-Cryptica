import { describe, expect, it } from "vitest";
import { parseInlineLinks } from "./inline-links";

describe("parseInlineLinks", () => {
  it("returns plain text untouched as a single segment", () => {
    expect(parseInlineLinks("No links here.")).toEqual([
      { kind: "text", text: "No links here." },
    ]);
  });

  it("splits external and site links out of the surrounding text", () => {
    expect(
      parseInlineLinks(
        "See the [SJ Games table](https://www.sjgames.com/t.pdf) and [our guide](/answers/x).",
      ),
    ).toEqual([
      { kind: "text", text: "See the " },
      {
        kind: "link",
        text: "SJ Games table",
        href: "https://www.sjgames.com/t.pdf",
        external: true,
      },
      { kind: "text", text: " and " },
      {
        kind: "link",
        text: "our guide",
        href: "/answers/x",
        external: false,
      },
      { kind: "text", text: "." },
    ]);
  });

  it("leaves unsafe or malformed links as text", () => {
    const unsafe = "Click [here](javascript:alert(1)) or [there](example.com).";
    expect(parseInlineLinks(unsafe)).toEqual([{ kind: "text", text: unsafe }]);
  });

  it("handles a string that is only a link", () => {
    expect(parseInlineLinks("[SRD](https://srd.example.com/)")).toEqual([
      {
        kind: "link",
        text: "SRD",
        href: "https://srd.example.com/",
        external: true,
      },
    ]);
  });
});
