import { afterEach, describe, expect, it } from "vitest";
import {
  SHELL_CANONICAL_ATTR,
  removeShellCanonicalWhenOverridden,
  watchShellCanonical,
} from "./shell-canonical";

const canonical = (href: string, shell = false) => {
  const link = document.createElement("link");
  link.rel = "canonical";
  link.href = href;
  if (shell) link.setAttribute(SHELL_CANONICAL_ATTR, "");
  return link;
};

const hrefs = () =>
  [...document.head.querySelectorAll('link[rel="canonical"]')].map((l) =>
    l.getAttribute("href"),
  );

afterEach(() => {
  document.head.innerHTML = "";
});

describe("removeShellCanonicalWhenOverridden", () => {
  it("drops the shell canonical when a page sets a different one", () => {
    document.head.append(
      canonical("https://codexcryptica.com/", true),
      canonical("https://codexcryptica.com/share/abc"),
    );
    removeShellCanonicalWhenOverridden(document);
    expect(hrefs()).toEqual(["https://codexcryptica.com/share/abc"]);
  });

  it("keeps the shell canonical when it is the only one", () => {
    document.head.append(canonical("https://codexcryptica.com/", true));
    removeShellCanonicalWhenOverridden(document);
    expect(hrefs()).toEqual(["https://codexcryptica.com/"]);
  });

  it("never removes a page's own canonical", () => {
    document.head.append(
      canonical("https://codexcryptica.com/a"),
      canonical("https://codexcryptica.com/b"),
    );
    removeShellCanonicalWhenOverridden(document);
    expect(hrefs()).toHaveLength(2);
  });
});

describe("watchShellCanonical", () => {
  it("removes the shell canonical when a page adds its own later", async () => {
    document.head.append(canonical("https://codexcryptica.com/", true));
    const stop = watchShellCanonical(document);
    document.head.append(canonical("https://codexcryptica.com/share/abc"));
    await Promise.resolve();
    expect(hrefs()).toEqual(["https://codexcryptica.com/share/abc"]);
    stop();
  });

  it("stops watching after the returned stop function is called", async () => {
    document.head.append(canonical("https://codexcryptica.com/", true));
    const stop = watchShellCanonical(document);
    stop();
    document.head.append(canonical("https://codexcryptica.com/x"));
    await Promise.resolve();
    expect(hrefs()).toHaveLength(2);
  });
});
