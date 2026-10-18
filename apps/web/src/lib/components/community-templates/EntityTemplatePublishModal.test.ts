/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/stores/help.svelte", () => ({
  helpStore: { openHelpToArticle: vi.fn() },
}));
vi.mock("$app/paths", () => ({ resolve: (p: string) => p }));
vi.mock("$lib/utils/download", () => ({ downloadText: vi.fn() }));
vi.mock(
  "$lib/stores/entity-templates/entity-template-publish-store.svelte",
  () => ({
    entityTemplatePublishStore: {},
  }),
);

import EntityTemplatePublishModal from "./EntityTemplatePublishModal.svelte";
import { downloadText } from "$lib/utils/download";

const template = {
  id: "t1",
  name: "Guild Hall",
  entityType: "location",
  markdown: "## Rooms\n\nBig.\n",
  source: "user",
  version: 1,
} as any;

const listing = { listingId: "L1" };
function store(over: Record<string, unknown> = {}) {
  return {
    publish: vi.fn(async () => ({
      listing,
      ownerToken: "secret-token",
      linkSaved: true,
    })),
    update: vi.fn(async () => ({})),
    ...over,
  } as any;
}

async function fill(desc = "A place for guilds.", labels = "Fantasy") {
  await fireEvent.input(screen.getByLabelText("Description"), {
    target: { value: desc },
  });
  await fireEvent.input(screen.getByLabelText(/Labels/), {
    target: { value: labels },
  });
}

describe("EntityTemplatePublishModal (publish)", () => {
  it("hides the decorative close icon from assistive technology", () => {
    render(EntityTemplatePublishModal, { template, store: store() });
    const closeButton = screen.getByRole("button", { name: "Close" });
    expect(closeButton.querySelector("span")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("shows the full body that will become public and says what publishing means", () => {
    render(EntityTemplatePublishModal, { template, store: store() });
    expect(screen.getByTestId("entity-template-preview").textContent).toBe(
      "## Rooms\n\nBig.\n",
    );
    expect(screen.getByText(/makes this template public/i)).toBeTruthy();
    expect(screen.getByText(/unpublish or delete it later/i)).toBeTruthy();
  });

  it("links to the sharing help article", async () => {
    const { helpStore } = await import("$lib/stores/help.svelte");
    render(EntityTemplatePublishModal, { template, store: store() });
    await fireEvent.click(screen.getByText("How sharing works"));
    expect(helpStore.openHelpToArticle).toHaveBeenCalledWith(
      "sharing-templates",
    );
  });

  it("shows live counters for the description and labels", async () => {
    render(EntityTemplatePublishModal, { template, store: store() });
    await fill("Hello", "One, Two, one");
    expect(screen.getByTestId("description-counter").textContent).toMatch(
      /5\/500/,
    );
    expect(screen.getByTestId("labels-counter").textContent).toMatch(/2\/8/);
  });

  it("does not publish without the acknowledgment, and says why", async () => {
    const s = store();
    render(EntityTemplatePublishModal, { template, store: s });
    await fill();
    await fireEvent.click(screen.getByText("Publish", { selector: "button" }));
    expect(s.publish).not.toHaveBeenCalled();
    expect(screen.getByTestId("publish-issues").textContent).toMatch(
      /happy for this template to be public/i,
    );
  });

  it.each([
    ["no label", ["A description.", ""], /label/i],
    ["a missing description", ["", "Fantasy"], /description/i],
    [
      "too many labels",
      ["A description.", "a,b,c,d,e,f,g,h,i"],
      /at most 8 labels/i,
    ],
    [
      "a label that is too long",
      ["A description.", "x".repeat(31)],
      /under 30 characters/i,
    ],
    [
      "an over-long description",
      ["d".repeat(501), "Fantasy"],
      /under 500 characters/i,
    ],
  ])("blocks publishing with %s", async (_l, [desc, labels], pattern) => {
    const s = store();
    render(EntityTemplatePublishModal, { template, store: s });
    await fill(desc as string, labels as string);
    await fireEvent.click(screen.getByRole("checkbox"));
    await fireEvent.click(screen.getByText("Publish", { selector: "button" }));
    expect(s.publish).not.toHaveBeenCalled();
    expect(screen.getByTestId("publish-issues").textContent).toMatch(
      pattern as RegExp,
    );
  });

  it("blocks publishing an empty template", async () => {
    const s = store();
    render(EntityTemplatePublishModal, {
      template: { ...template, markdown: "" },
      store: s,
    });
    await fill();
    await fireEvent.click(screen.getByRole("checkbox"));
    await fireEvent.click(screen.getByText("Publish", { selector: "button" }));
    expect(s.publish).not.toHaveBeenCalled();
    expect(screen.getByTestId("publish-issues").textContent).toMatch(
      /nothing to share/i,
    );
  });

  it("publishes, then shows the owner token once with copy and save controls", async () => {
    const s = store();
    const onDone = vi.fn();
    render(EntityTemplatePublishModal, { template, store: s, onDone });
    await fill("A place for guilds.", "Fantasy, Pathfinder");
    await fireEvent.input(screen.getByLabelText(/Display name/), {
      target: { value: "Ada" },
    });
    await fireEvent.click(screen.getByRole("checkbox"));
    await fireEvent.click(screen.getByText("Publish", { selector: "button" }));
    expect(await screen.findByTestId("owner-token")).toBeTruthy();
    expect(screen.getByTestId("owner-token").textContent).toBe("secret-token");
    expect(s.publish).toHaveBeenCalledWith("t1", {
      description: "A place for guilds.",
      labels: ["Fantasy", "Pathfinder"],
      ownerDisplayName: "Ada",
    });
    expect(onDone).toHaveBeenCalled();
    await fireEvent.click(screen.getByText("Save as file"));
    expect(downloadText).toHaveBeenCalled();
    expect((downloadText as any).mock.calls[0][0]).toContain("secret-token");
  });

  it("warns if the device could not remember the listing", async () => {
    const s = store({
      publish: vi.fn(async () => ({
        listing,
        ownerToken: "tok",
        linkSaved: false,
      })),
    });
    render(EntityTemplatePublishModal, { template, store: s });
    await fill();
    await fireEvent.click(screen.getByRole("checkbox"));
    await fireEvent.click(screen.getByText("Publish", { selector: "button" }));
    expect(
      await screen.findByText(/couldn't remember the listing/i),
    ).toBeTruthy();
  });

  it("keeps the form intact and shows the message when publishing fails", async () => {
    const s = store({
      publish: vi
        .fn()
        .mockRejectedValue(new Error("Couldn't reach the template directory.")),
    });
    render(EntityTemplatePublishModal, { template, store: s });
    await fill("Keep me", "Fantasy");
    await fireEvent.click(screen.getByRole("checkbox"));
    await fireEvent.click(screen.getByText("Publish", { selector: "button" }));
    expect(
      await screen.findByText("Couldn't reach the template directory."),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Description") as HTMLTextAreaElement).value,
    ).toBe("Keep me");
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(
      true,
    );
  });
});

describe("EntityTemplatePublishModal (update)", () => {
  it("prefills the form, needs no new acknowledgment, and updates", async () => {
    const s = store();
    render(EntityTemplatePublishModal, {
      template,
      mode: "update",
      initial: {
        description: "Stored.",
        labels: ["Fantasy"],
        ownerDisplayName: "Ada",
      },
      store: s,
    });
    expect(
      (screen.getByLabelText("Description") as HTMLTextAreaElement).value,
    ).toBe("Stored.");
    expect(screen.queryByRole("checkbox")).toBeNull();
    await fireEvent.click(screen.getByText("Update listing"));
    expect(await screen.findByText(/Updated\./)).toBeTruthy();
    expect(s.update).toHaveBeenCalledWith("t1", {
      description: "Stored.",
      labels: ["Fantasy"],
      ownerDisplayName: "Ada",
    });
  });
});
