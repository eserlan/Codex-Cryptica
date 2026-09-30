/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HELP_ASSISTANT_DEV_SWITCH,
  isHelpAssistantEnabled,
} from "./help-assistant";

describe("isHelpAssistantEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is off by default", () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "");
    expect(isHelpAssistantEnabled()).toBe(false);
  });

  it("is off for values other than the exact string 'true'", () => {
    for (const value of ["1", "TRUE", "yes", "false", " true"]) {
      vi.stubEnv("VITE_HELP_ASSISTANT", value);
      expect(isHelpAssistantEnabled()).toBe(false);
    }
  });

  it("is on only when VITE_HELP_ASSISTANT is exactly 'true'", () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "true");
    expect(isHelpAssistantEnabled()).toBe(true);
  });
});

describe("development switch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.removeItem(HELP_ASSISTANT_DEV_SWITCH);
  });

  it("turns the assistant on in a development build", () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "");
    vi.stubEnv("DEV", true);
    localStorage.setItem(HELP_ASSISTANT_DEV_SWITCH, "true");
    expect(isHelpAssistantEnabled()).toBe(true);
  });

  it("is ignored by a production build", () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "");
    vi.stubEnv("DEV", false);
    localStorage.setItem(HELP_ASSISTANT_DEV_SWITCH, "true");
    expect(isHelpAssistantEnabled()).toBe(false);
  });

  it("stays off when the switch is not exactly 'true'", () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "");
    vi.stubEnv("DEV", true);
    localStorage.setItem(HELP_ASSISTANT_DEV_SWITCH, "yes");
    expect(isHelpAssistantEnabled()).toBe(false);
  });

  it("does not throw when storage is unavailable", () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "");
    vi.stubEnv("DEV", true);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(isHelpAssistantEnabled()).toBe(false);
    vi.restoreAllMocks();
  });
});
