/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import BiomeProfileEditor from "./BiomeProfileEditor.svelte";
import { makeStore } from "$lib/stores/biome-explorer.test-helpers";

function setup() {
  const made = makeStore();
  made.store.startFromReference("tundra");
  made.store.setTitle("Ashen Flats");
  render(BiomeProfileEditor, { props: { store: made.store } });
  return made;
}

const png = () =>
  new File([new Uint8Array(4)], "flats.png", { type: "image/png" });

describe("BiomeProfileEditor illustration prompt", () => {
  it("shows a prompt that starts with the fixed prefix and copies it", async () => {
    const { copied } = setup();
    const box = screen.getByLabelText(
      "Illustration prompt",
    ) as HTMLTextAreaElement;
    expect(box.value.startsWith("fantasy, illustration of")).toBe(true);
    await fireEvent.click(screen.getByRole("button", { name: "Copy prompt" }));
    await waitFor(() => expect(copied[0]).toBe(box.value));
  });

  it("includes a fictional change in the prompt", async () => {
    const { store } = setup();
    store.addAlteration({ aspect: "climate", description: "It rains ash" });
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Illustration prompt") as HTMLTextAreaElement)
          .value,
      ).toContain("It rains ash"),
    );
  });

  it("shows the prompt as selectable text when the clipboard is unavailable", async () => {
    const { breakClipboard } = setup();
    breakClipboard();
    await fireEvent.click(screen.getByRole("button", { name: "Copy prompt" }));
    expect(await screen.findByTestId("biome-copy-fallback")).toBeTruthy();
  });

  it("keeps the prompt with the biome and can remove it again", async () => {
    const { store } = setup();
    await fireEvent.click(
      screen.getByRole("button", { name: "Keep prompt with this biome" }),
    );
    expect(store.draft?.profile.illustrationPrompt).toBeTruthy();
    await fireEvent.click(
      await screen.findByRole("button", { name: "Remove saved prompt" }),
    );
    expect(store.draft?.profile.illustrationPrompt).toBeUndefined();
  });
});

describe("BiomeProfileEditor links", () => {
  it("adds a link and shows it", async () => {
    const { store } = setup();
    await fireEvent.input(screen.getByLabelText("Link address"), {
      target: { value: "https://example.com/research" },
    });
    await fireEvent.input(screen.getByLabelText("Link name"), {
      target: { value: "Research" },
    });
    await fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    expect(store.draft?.profile.referenceLinks).toHaveLength(1);
    const link = await screen.findByRole("link", { name: "Research" });
    expect(link.getAttribute("href")).toBe("https://example.com/research");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("explains that only https links are accepted", async () => {
    const { store } = setup();
    await fireEvent.input(screen.getByLabelText("Link address"), {
      target: { value: "http://example.com" },
    });
    await fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/https/);
    expect(store.draft?.profile.referenceLinks).toEqual([]);
  });

  it("removes a link", async () => {
    const { store } = setup();
    store.addReferenceLink("https://example.com/a", "A");
    await fireEvent.click(
      await screen.findByRole("button", { name: "Remove link: A" }),
    );
    expect(store.draft?.profile.referenceLinks).toEqual([]);
  });
});

describe("BiomeProfileEditor picture", () => {
  it("asks to save first, and does not offer the file chooser, for an unsaved biome", () => {
    setup();
    expect(screen.getByText(/Save the biome first/)).toBeTruthy();
    expect(
      (screen.getByLabelText("Add a picture") as HTMLInputElement).disabled,
    ).toBe(true);
  });

  it("attaches a picture to a saved biome and shows it apart from the library images", async () => {
    const { store } = setup();
    await store.save();
    const input = (await screen.findByLabelText(
      "Add a picture",
    )) as HTMLInputElement;
    await waitFor(() => expect(input.disabled).toBe(false));
    await fireEvent.change(input, { target: { files: [png()] } });
    const img = await screen.findByRole("img", {
      name: /Your picture for Ashen Flats/,
    });
    expect(img.getAttribute("src")).toBe("blob:flats.png");
    expect(screen.queryByText(/AI illustration/)).toBeNull();
  });

  it("shows a plain error and leaves the biome unchanged for an unsupported file", async () => {
    const { store } = setup();
    await store.save();
    const input = (await screen.findByLabelText(
      "Add a picture",
    )) as HTMLInputElement;
    await waitFor(() => expect(input.disabled).toBe(false));
    const text = new File(["hello"], "notes.txt", { type: "text/plain" });
    await fireEvent.change(input, { target: { files: [text] } });
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /Choose an image file/,
    );
    expect(store.attachedImageUrl).toBe("");
  });

  it("removes an attached picture", async () => {
    const { store } = setup();
    await store.save();
    await store.attachImage(png());
    await fireEvent.click(
      await screen.findByRole("button", { name: "Remove picture" }),
    );
    await waitFor(() => expect(store.attachedImageUrl).toBe(""));
  });
});
