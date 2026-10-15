/** @vitest-environment jsdom */
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { generateOneShotLocal } from "generator-engine";
import { generatorEngine } from "$lib/services/seo/generator-engine";
import OneShotRefinePanel from "./OneShotRefinePanel.svelte";
import OneShotFormFields from "./OneShotFormFields.svelte";

describe("OneShotRefinePanel", () => {
  it("regenerates one scene and hands back a whole, updated result", async () => {
    const output = generateOneShotLocal({ durationHours: 3 });
    const onReplace = vi.fn();
    render(OneShotRefinePanel, {
      props: { output: output as never, onReplace },
    });

    const scene = output.oneShot!.scenes[1];
    await fireEvent.click(
      screen.getByRole("button", { name: `Regenerate scene ${scene.title}` }),
    );

    await waitFor(() => expect(onReplace).toHaveBeenCalledTimes(1));
    const next = onReplace.mock.calls[0][0];
    expect(next.oneShot.scenes).toHaveLength(output.oneShot!.scenes.length);
    expect(next.oneShot.scenes[1].minutes).toBe(scene.minutes);
    expect(next.content).toContain("## GM Briefing");
  });

  it("drops a late result when a newer adventure replaced the old one", async () => {
    const first = generateOneShotLocal({ durationHours: 3 });
    const second = generateOneShotLocal({ durationHours: 4 });
    let finish: (r: unknown) => void = () => {};
    const spy = vi
      .spyOn(generatorEngine, "regenerateOneShotPart")
      .mockReturnValue(new Promise((resolve) => (finish = resolve)) as never);
    const onReplace = vi.fn();
    const { rerender } = render(OneShotRefinePanel, {
      props: { output: first as never, onReplace },
    });
    await fireEvent.click(
      screen.getByRole("button", {
        name: `Regenerate scene ${first.oneShot!.scenes[1].title}`,
      }),
    );
    await rerender({ output: second as never, onReplace });
    finish({ adventure: structuredClone(first.oneShot), warnings: [] });
    await new Promise((r) => setTimeout(r, 20));
    expect(onReplace).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("drops a pending result when the panel is destroyed", async () => {
    const output = generateOneShotLocal({ durationHours: 3 });
    let finish: (r: unknown) => void = () => {};
    const spy = vi
      .spyOn(generatorEngine, "regenerateOneShotPart")
      .mockReturnValue(new Promise((resolve) => (finish = resolve)) as never);
    const onReplace = vi.fn();
    const { unmount } = render(OneShotRefinePanel, {
      props: { output: output as never, onReplace, useAI: true },
    });
    await fireEvent.click(
      screen.getByRole("button", {
        name: `Regenerate scene ${output.oneShot!.scenes[1].title}`,
      }),
    );

    const signal = spy.mock.calls[0]?.[2]?.signal;
    expect(signal).toBeInstanceOf(AbortSignal);
    unmount();
    expect(signal?.aborted).toBe(true);
    finish({
      adventure: structuredClone(output.oneShot),
      warnings: [],
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onReplace).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("sends a quick revision request for one scene", async () => {
    const output = generateOneShotLocal({ durationHours: 3 });
    const scene = output.oneShot!.scenes[1];
    const spy = vi
      .spyOn(generatorEngine, "regenerateOneShotPart")
      .mockResolvedValue({ adventure: output.oneShot!, warnings: [] });
    render(OneShotRefinePanel, {
      props: { output: output as never, onReplace: vi.fn(), useAI: true },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: `Revise scene ${scene.title}` }),
    );
    const input = screen.getByLabelText(`How to revise scene ${scene.title}`);
    expect(document.activeElement).toBe(input);
    const apply = screen.getByRole("button", { name: "Apply" });
    expect((apply as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.input(input, {
      target: { value: "make the guard bribable" },
    });
    await fireEvent.click(apply);
    expect(spy).toHaveBeenCalledWith(
      output.oneShot,
      { kind: "scene", id: scene.id },
      expect.objectContaining({
        useAI: true,
        instruction: "make the guard bribable",
      }),
    );
    expect(
      screen.queryByLabelText(`How to revise scene ${scene.title}`),
    ).toBeNull();
    spy.mockRestore();
  });

  it("closes the revise box on Escape without sending anything", async () => {
    const output = generateOneShotLocal({});
    const npc = output.oneShot!.npcs[0];
    const spy = vi.spyOn(generatorEngine, "regenerateOneShotPart");
    render(OneShotRefinePanel, {
      props: { output: output as never, onReplace: vi.fn(), useAI: true },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: `Revise NPC ${npc.name}` }),
    );
    const input = screen.getByLabelText(`How to revise NPC ${npc.name}`);
    await fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByLabelText(`How to revise NPC ${npc.name}`)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("hides Revise when AI is off, since local re-rolls can't follow it", () => {
    render(OneShotRefinePanel, {
      props: { output: generateOneShotLocal({}) as never, onReplace: vi.fn() },
    });
    expect(screen.queryByRole("button", { name: /^Revise / })).toBeNull();
  });

  it("renders nothing without a structured one-shot", () => {
    const { queryByTestId } = render(OneShotRefinePanel, {
      props: {
        output: {
          type: "note",
          title: "x",
          content: "",
          lore: "",
          labels: [],
          status: "active",
        } as never,
        onReplace: vi.fn(),
      },
    });
    expect(queryByTestId("one-shot-refine-panel")).toBeNull();
  });

  it("tells the GM when copying fails", async () => {
    const output = generateOneShotLocal({});
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });
    render(OneShotRefinePanel, {
      props: { output: output as never, onReplace: vi.fn() },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: /copy gm sheet/i }),
    );
    await waitFor(() =>
      expect(screen.getByText(/couldn't copy/i)).toBeTruthy(),
    );
  });
});

describe("OneShotFormFields", () => {
  it("only asks for a level once a system is chosen", async () => {
    render(OneShotFormFields);
    await fireEvent.click(screen.getByText("Advanced options"));
    expect(screen.queryByLabelText("Level or tier")).toBeNull();
    await fireEvent.change(screen.getByLabelText("System"), {
      target: { value: "D&D 5e" },
    });
    expect(screen.getByLabelText("Level or tier")).toBeTruthy();
  });

  it("Surprise Me leaves the genre alone", async () => {
    const onSurprise = vi.fn();
    render(OneShotFormFields, {
      props: { genre: "Cosmic Horror", onSurprise } as never,
    });
    await fireEvent.click(screen.getByRole("button", { name: /surprise me/i }));
    expect(onSurprise).toHaveBeenCalled();
    expect((screen.getByLabelText("Genre") as HTMLSelectElement).value).toBe(
      "Cosmic Horror",
    );
  });
});
