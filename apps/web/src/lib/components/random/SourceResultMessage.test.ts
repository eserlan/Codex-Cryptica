import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import SourceResultMessage from "./SourceResultMessage.svelte";

describe("SourceResultMessage", () => {
  it("renders roll result and highlights recognized vault entities as interactive chips", async () => {
    const onSelectEntity = vi.fn();
    const mockEntities = [
      { id: "ent-1", title: "Sera Voight", category: "character" },
    ];

    render(SourceResultMessage, {
      props: {
        result: {
          sourceName: "Harbor Encounters",
          finalText: "Sera Voight offers a secret contract at midnight.",
        } as any,
        entities: mockEntities,
        onSelectEntity,
        isGuest: () => false,
      },
    });

    const mentionBtn = screen.getByTestId("entity-mention-ent-1");
    expect(mentionBtn).toBeDefined();
    expect(mentionBtn.textContent).toContain("Sera Voight");

    await fireEvent.click(mentionBtn);
    expect(onSelectEntity).toHaveBeenCalledWith("ent-1");
  });

  it("allows saving the result as a note", async () => {
    const createEntity = vi.fn().mockResolvedValue("note-123");

    render(SourceResultMessage, {
      props: {
        result: {
          sourceName: "Harbor Encounters",
          finalText: "A strange fog descends.",
        } as any,
        createEntity,
        isGuest: () => false,
      },
    });

    const keepBtn = screen.getByTestId("keep-result");
    await fireEvent.click(keepBtn);

    expect(createEntity).toHaveBeenCalledWith("note", "Harbor Encounters", {
      content: "A strange fog descends.",
    });
  });
});
