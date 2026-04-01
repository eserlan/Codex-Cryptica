import { describe, expect, it, vi } from "vitest";
import {
  canOverrideTarget,
  getTargetEntityId,
  isLoreMessage,
  renderMessageHtml,
  shouldShowActions,
  shouldShowCreateAction,
} from "./chat-message.helpers";

describe("chat-message helpers", () => {
  it("prefers archive target over entity and active target ids", () => {
    expect(
      getTargetEntityId(
        { archiveTargetId: "archive", entityId: "entity" },
        "active",
      ),
    ).toBe("archive");
    expect(
      getTargetEntityId(
        { archiveTargetId: null, entityId: "entity" },
        "active",
      ),
    ).toBe("entity");
    expect(
      getTargetEntityId({ archiveTargetId: null, entityId: null }, "active"),
    ).toBe("active");
  });

  it("detects lore intent from the previous user message or length", () => {
    expect(
      isLoreMessage({ id: "assistant-1", content: "brief" }, [
        { id: "user-1", role: "user", content: "please write a chronicle" },
        { id: "assistant-1", role: "assistant", content: "brief" },
      ]),
    ).toBe(false);

    expect(
      isLoreMessage({ id: "assistant-2", content: "brief" }, [
        { id: "user-2", role: "user", content: "go deep dive into the lore" },
        { id: "assistant-2", role: "assistant", content: "brief" },
      ]),
    ).toBe(true);

    expect(
      isLoreMessage({ id: "assistant-3", content: "x".repeat(401) }, [
        { id: "assistant-3", role: "assistant", content: "x".repeat(401) },
      ]),
    ).toBe(true);
  });

  it("gates action visibility and create affordances", () => {
    expect(
      shouldShowActions(
        { role: "assistant", type: "text", content: "hello" },
        { title: "Hello", wasSplit: false },
        false,
      ),
    ).toBe(true);
    expect(
      shouldShowActions(
        { role: "assistant", type: "wizard", content: "hello" },
        { title: "Hello", wasSplit: false },
        false,
      ),
    ).toBe(false);
    expect(shouldShowCreateAction({ title: "New Entity" }, false, false)).toBe(
      true,
    );
    expect(canOverrideTarget("target", "active")).toBe(true);
    expect(canOverrideTarget("target", "target")).toBe(false);
  });

  it("renders and sanitizes message html when browser mode is enabled", async () => {
    const parser = {
      parse: vi
        .fn()
        .mockResolvedValue('<p><a href="javascript:alert(1)">x</a></p>'),
    };
    const domPurify = {
      sanitize: vi
        .fn()
        .mockImplementation((html) => html.replace("javascript:alert(1)", "#")),
    };

    await expect(
      renderMessageHtml("hello", parser, true, domPurify),
    ).resolves.toBe('<p><a href="#">x</a></p>');
    expect(parser.parse).toHaveBeenCalledWith("hello");
    expect(domPurify.sanitize).toHaveBeenCalled();
  });
});
