/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  p2pHost: {
    isHosting: false,
    state: {
      status: "idle",
      latencyMs: -1,
      peerId: null,
      remotePeerId: null,
      retryCount: 0,
    },
  },
  p2pGuestService: {
    state: {
      status: "idle",
      latencyMs: -1,
      peerId: null,
      remotePeerId: null,
      retryCount: 0,
    },
  },
  sessionModeStore: { isGuestMode: false },
}));

vi.mock("#lib/cloud-bridge/p2p/host-service.svelte.js", () => ({
  p2pHost: mocks.p2pHost,
}));
vi.mock("#lib/cloud-bridge/p2p/guest-service.js", () => ({
  p2pGuestService: mocks.p2pGuestService,
}));
vi.mock("#lib/stores/ui/session-mode.svelte.js", () => ({
  sessionModeStore: mocks.sessionModeStore,
}));

import P2PStatus from "./P2PStatus.svelte";

describe("P2PStatus", () => {
  beforeEach(() => {
    mocks.p2pHost.isHosting = false;
    mocks.p2pHost.state = {
      status: "idle",
      latencyMs: -1,
      peerId: null,
      remotePeerId: null,
      retryCount: 0,
    };
    mocks.p2pGuestService.state = {
      status: "idle",
      latencyMs: -1,
      peerId: null,
      remotePeerId: null,
      retryCount: 0,
    };
    mocks.sessionModeStore.isGuestMode = false;
  });

  it("announces a connected host status to screen readers", () => {
    mocks.p2pHost.isHosting = true;
    mocks.p2pHost.state = {
      status: "connected",
      latencyMs: 42,
      peerId: null,
      remotePeerId: null,
      retryCount: 0,
    };

    render(P2PStatus);

    const status = screen.getByRole("status", {
      name: "P2P Connection Status",
    });
    expect(status.textContent).toContain("P2P Connected as Host (42ms)");
  });

  it("announces a failed guest connection", () => {
    mocks.sessionModeStore.isGuestMode = true;
    mocks.p2pGuestService.state = {
      status: "failed",
      latencyMs: -1,
      peerId: null,
      remotePeerId: null,
      retryCount: 0,
    };

    render(P2PStatus);

    const status = screen.getByRole("status", {
      name: "P2P Connection Status",
    });
    expect(status.textContent).toContain("P2P Connection Failed");
  });
});
