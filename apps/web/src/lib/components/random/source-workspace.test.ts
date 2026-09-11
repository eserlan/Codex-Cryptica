import { describe, expect, it } from "vitest";

import { DEFAULT_MODE, resolveMode } from "./source-workspace";

describe("workspace mode", () => {
  const search = (query: string) => new URLSearchParams(query);

  // Play is the default because the workspace is opened mid-session far more
  // often than it is opened to write something (issue 2258).
  it("defaults to use when nothing asks otherwise", () => {
    expect(resolveMode(search(""))).toBe("use");
    expect(DEFAULT_MODE).toBe("use");
  });

  it("honours a mode asked for in the URL", () => {
    expect(resolveMode(search("mode=build"))).toBe("build");
    expect(resolveMode(search("mode=use"))).toBe("use");
  });

  it("falls back to the stored mode when the URL says nothing", () => {
    expect(resolveMode(search(""), "build")).toBe("build");
    expect(resolveMode(search(""), "use")).toBe("use");
  });

  // A link is a deliberate act; the stored value is just where you were last.
  it("lets the URL win over what was stored", () => {
    expect(resolveMode(search("mode=use"), "build")).toBe("use");
    expect(resolveMode(search("mode=build"), "use")).toBe("build");
  });

  // A typo, a stale link, or a corrupted storage value should land somebody in
  // the readable view rather than in a screen full of form fields.
  it("ignores anything it does not recognise", () => {
    expect(resolveMode(search("mode=edit"))).toBe("use");
    expect(resolveMode(search("mode="))).toBe("use");
    expect(resolveMode(search("mode=BUILD"))).toBe("use");
    expect(resolveMode(search(""), "nonsense")).toBe("use");
    expect(resolveMode(search(""), null)).toBe("use");
    expect(resolveMode(search("mode=edit"), "build")).toBe("build");
  });
});
