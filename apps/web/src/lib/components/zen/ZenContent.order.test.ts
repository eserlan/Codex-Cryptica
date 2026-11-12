/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import ZenContent from "./ZenContent.svelte";
import { vault } from "#lib/stores/vault.svelte.js";

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));

vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: {
    isGuest: false,
    defaultVisibility: "public",
    allEntities: [],
    entities: {},
    inboundConnections: {},
    titleAndAliasIndex: [],
  },
}));

vi.mock("#lib/stores/theme.svelte.js", () => ({
  themeStore: {
    activeTheme: { id: "fantasy" },
    jargon: {
      chronicle_header: "Chronicle of Ages",
      lore_header: "Hidden Lore",
    },
  },
}));

vi.mock("#lib/services/RevisionService.svelte.js", () => ({
  revisionService: { pendingDraft: null, isRevising: false },
}));

vi.mock("#lib/components/MarkdownEditor.svelte", () => ({
  default: vi.fn(),
}));

vi.mock(
  "#lib/components/entity-detail/proposals/DetailProposals.svelte",
  () => ({ default: vi.fn() }),
);

vi.mock("#lib/stores/ui/modal-ui.svelte.js", () => ({
  modalUIStore: {
    openGeneratorWorkflowForEntity: vi.fn(),
    openRevisionDialog: vi.fn(),
  },
}));

const entity = {
  id: "entity-1",
  title: "Zen Source",
  type: "character",
  content: "Main text",
  lore: "Secret lore",
  connections: [],
} as any;

const renderZen = () =>
  render(ZenContent, {
    entity,
    editState: { isEditing: false } as any,
    scrollContainer: undefined,
  });

const follows = (a: Node, b: Node) =>
  !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

afterEach(() => {
  cleanup();
  (vault as any).isGuest = false;
});

describe("ZenContent ordering", () => {
  it("reads text, then GM notes, then tools for an owner with lore", () => {
    renderZen();
    const text = screen.getByTestId("entity-main-text");
    const gmNotes = screen.getByTestId("entity-gm-notes");
    const tools = screen.getByTestId("entity-overview-tools");
    expect(follows(text, gmNotes)).toBe(true);
    expect(follows(gmNotes, tools)).toBe(true);
  });

  it("puts nothing above the text and has no chronicle heading", () => {
    renderZen();
    const text = screen.getByTestId("entity-main-text");
    const aiRevise = screen.getByRole("button", {
      name: "Revise Chronicle and Lore with AI",
    });
    expect(follows(text, aiRevise)).toBe(true);
    for (const heading of screen.queryAllByRole("heading")) {
      expect(heading.textContent).not.toContain("Chronicle of Ages");
    }
  });

  it("shows a guest no GM notes and no tools group", () => {
    (vault as any).isGuest = true;
    renderZen();
    expect(screen.queryByTestId("entity-gm-notes")).toBeNull();
    expect(screen.queryByTestId("entity-overview-tools")).toBeNull();
  });
});
