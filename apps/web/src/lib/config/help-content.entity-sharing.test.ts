import { describe, expect, it } from "vitest";
import { FEATURE_HELP_ARTICLES } from "./help-content";
import { loadHelpArticles } from "$lib/content/loader";

const article = (id: string) => loadHelpArticles().find((a) => a.id === id);

describe("sharing entity templates help", () => {
  it("has a Sharing templates article registered for the publish and install flows", () => {
    expect(FEATURE_HELP_ARTICLES.SHARING_ENTITY_TEMPLATES).toBe(
      "sharing-templates",
    );
    const a = article("sharing-templates");
    expect(a).toBeDefined();
    expect(a!.title).toBe("Sharing Templates");
  });

  it("explains what is shared, that the full text becomes public, and how to take it back", () => {
    const text = article("sharing-templates")!.content;
    expect(text).toMatch(/name, the type and the text/i);
    expect(text).toMatch(/whole template text is public|full text .* public/i);
    expect(text).toMatch(/never includes your notes/i);
    expect(text).toMatch(/unpublish/i);
    expect(text).toMatch(/delete permanently/i);
    expect(text).toMatch(/owner token/i);
  });

  it("says installed templates are independent local copies that never become the default", () => {
    const text = article("sharing-templates")!.content;
    expect(text).toMatch(/copy/i);
    expect(text).toMatch(/never .*default|won't .*default/i);
    expect(text).toMatch(/later changes|doesn't change/i);
  });

  it("says an operator removal is final and how to report a listing", () => {
    const text = article("sharing-templates")!.content;
    expect(text).toMatch(/removed by the operator|operator removes/i);
    expect(text).toMatch(/report/i);
  });

  it("links the entity templates article to it", () => {
    const templates = article("default-entity-templates")!;
    expect(templates.content).toMatch(/Sharing Templates/);
  });

  it("uses labels, not tags, in user-facing text", () => {
    expect(article("sharing-templates")!.content).not.toMatch(/\btags?\b/i);
  });
});
