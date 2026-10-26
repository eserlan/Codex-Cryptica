import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getAllLandingPages } from "./registry";

const ROUTES_DIR = path.resolve(__dirname, "../../../routes");

/** Every page route as a matcher, with `(group)` folders dropped. */
function routeMatchers(dir = ROUTES_DIR, route = ""): RegExp[] {
  const matchers = fs.existsSync(path.join(dir, "+page.svelte"))
    ? [
        new RegExp(
          `^${(route || "/").replace(/\[\.\.\.[^\]]+\]/g, ".+").replace(/\[[^\]]+\]/g, "[^/]+")}$`,
        ),
      ]
    : [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const segment = entry.name.startsWith("(") ? "" : `/${entry.name}`;
    matchers.push(
      ...routeMatchers(path.join(dir, entry.name), route + segment),
    );
  }
  return matchers;
}

const routes = routeMatchers();
const isRoute = (href: string) =>
  routes.some((route) => route.test(href.split(/[?#]/)[0] || "/"));

describe("/for landing page CTAs", () => {
  it("matches real routes, and rejects the retired /app path", () => {
    expect(isRoute("/")).toBe(true);
    expect(isRoute("/answers/what-is-a-point-crawl")).toBe(true);
    expect(isRoute("/app")).toBe(false);
  });

  it("point every pack's button at a route that exists", () => {
    const broken = getAllLandingPages()
      .filter((page) => !isRoute(page.cta.buttonHref))
      .map((page) => `${page.slug}: ${page.cta.buttonHref}`);
    expect(broken).toEqual([]);
  });
});
