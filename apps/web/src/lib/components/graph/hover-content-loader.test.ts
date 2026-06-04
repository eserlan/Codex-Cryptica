import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import {
  createHoverContentLoader,
  HOVER_CONTENT_LOAD_DELAY_MS,
} from "./hover-content-loader";

describe("createHoverContentLoader", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces hover content loading", () => {
    const loadEntityContent = vi.fn();
    const loader = createHoverContentLoader(loadEntityContent);

    loader.schedule("entity-1");
    vi.advanceTimersByTime(HOVER_CONTENT_LOAD_DELAY_MS - 1);

    expect(loadEntityContent).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(loadEntityContent).toHaveBeenCalledOnce();
    expect(loadEntityContent).toHaveBeenCalledWith("entity-1");
  });

  it("loads only the latest hovered entity when hover changes quickly", () => {
    const loadEntityContent = vi.fn();
    const loader = createHoverContentLoader(loadEntityContent);

    loader.schedule("entity-1");
    vi.advanceTimersByTime(75);
    loader.schedule("entity-2");
    vi.advanceTimersByTime(HOVER_CONTENT_LOAD_DELAY_MS - 1);

    expect(loadEntityContent).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(loadEntityContent).toHaveBeenCalledOnce();
    expect(loadEntityContent).toHaveBeenCalledWith("entity-2");
  });

  it("cancels pending loads when hover clears", () => {
    const loadEntityContent = vi.fn();
    const loader = createHoverContentLoader(loadEntityContent);

    loader.schedule("entity-1");
    loader.schedule(null);
    vi.advanceTimersByTime(HOVER_CONTENT_LOAD_DELAY_MS);

    expect(loadEntityContent).not.toHaveBeenCalled();
  });
});
