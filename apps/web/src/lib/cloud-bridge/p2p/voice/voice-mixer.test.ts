import { describe, it, expect, beforeEach } from "vitest";

import { HostVoiceMixer } from "./voice-mixer";

class FakeNode {
  connections = new Set<FakeNode>();
  connect(target: FakeNode) {
    this.connections.add(target);
  }
  disconnect(target?: FakeNode) {
    if (target) {
      if (!this.connections.has(target)) {
        throw new Error("not connected");
      }
      this.connections.delete(target);
    } else {
      this.connections.clear();
    }
  }
}

class FakeSourceNode extends FakeNode {
  constructor(public stream: unknown) {
    super();
  }
}

class FakeDestNode extends FakeNode {
  static count = 0;
  stream = { id: `mix-${++FakeDestNode.count}` };
}

class FakeAudioContext {
  destination = new FakeNode();
  resumed = false;
  closed = false;
  sources: FakeSourceNode[] = [];
  dests: FakeDestNode[] = [];

  resume() {
    this.resumed = true;
    return Promise.resolve();
  }
  close() {
    this.closed = true;
    return Promise.resolve();
  }
  createMediaStreamSource(stream: unknown) {
    const node = new FakeSourceNode(stream);
    this.sources.push(node);
    return node;
  }
  createMediaStreamDestination() {
    const node = new FakeDestNode();
    this.dests.push(node);
    return node;
  }
}

const micStream = { id: "mic" } as unknown as MediaStream;
const stream = (id: string) => ({ id }) as unknown as MediaStream;

describe("HostVoiceMixer", () => {
  let ctx: FakeAudioContext;
  let mixer: HostVoiceMixer;

  beforeEach(() => {
    ctx = new FakeAudioContext();
    mixer = new HostVoiceMixer(() => ctx as unknown as AudioContext);
  });

  it("throws when adding a guest before start", () => {
    expect(() => mixer.addGuest("g1")).toThrow("not running");
  });

  it("resumes the context and wires the mic into each guest mix", () => {
    mixer.start(micStream);
    expect(ctx.resumed).toBe(true);

    const mixForG1 = mixer.addGuest("g1");
    expect(mixForG1).toBe(ctx.dests[0].stream);

    const micSource = ctx.sources[0];
    expect(micSource.stream).toBe(micStream);
    expect(micSource.connections.has(ctx.dests[0])).toBe(true);
    // The host must not hear their own microphone.
    expect(micSource.connections.has(ctx.destination)).toBe(false);
  });

  it("routes guest audio to the host output and other guests only", () => {
    mixer.start(micStream);
    mixer.addGuest("g1");
    mixer.attachGuestStream("g1", stream("remote-g1"));
    mixer.addGuest("g2");
    mixer.attachGuestStream("g2", stream("remote-g2"));

    const [, g1Source, g2Source] = ctx.sources;
    const [g1Dest, g2Dest] = ctx.dests;

    // Both guests are audible to the host.
    expect(g1Source.connections.has(ctx.destination)).toBe(true);
    expect(g2Source.connections.has(ctx.destination)).toBe(true);
    // Each guest hears the other, never themselves.
    expect(g1Source.connections.has(g2Dest)).toBe(true);
    expect(g1Source.connections.has(g1Dest)).toBe(false);
    expect(g2Source.connections.has(g1Dest)).toBe(true);
    expect(g2Source.connections.has(g2Dest)).toBe(false);
    // A guest joining later still receives earlier guests (live graph).
    expect(g2Dest.connections.size).toBe(0); // dests have no outputs
  });

  it("disconnects a removed guest from every mix", () => {
    mixer.start(micStream);
    mixer.addGuest("g1");
    mixer.attachGuestStream("g1", stream("remote-g1"));
    mixer.addGuest("g2");
    mixer.attachGuestStream("g2", stream("remote-g2"));

    const [micSource, g1Source, g2Source] = ctx.sources;
    const [g1Dest] = ctx.dests;

    mixer.removeGuest("g1");

    expect(g1Source.connections.size).toBe(0);
    expect(micSource.connections.has(g1Dest)).toBe(false);
    expect(g2Source.connections.has(g1Dest)).toBe(false);
    // g2 keeps its own routing.
    expect(g2Source.connections.has(ctx.destination)).toBe(true);
  });

  it("replaces the previous mix when the same guest is re-added", () => {
    mixer.start(micStream);
    const first = mixer.addGuest("g1");
    const second = mixer.addGuest("g1");
    expect(second).not.toBe(first);
    // Old destination was fully unhooked from the mic.
    expect(ctx.sources[0].connections.has(ctx.dests[0])).toBe(false);
  });

  it("stop tears everything down and closes the context", () => {
    mixer.start(micStream);
    mixer.addGuest("g1");
    mixer.attachGuestStream("g1", stream("remote-g1"));

    mixer.stop();

    expect(mixer.running).toBe(false);
    expect(ctx.closed).toBe(true);
    expect(ctx.sources.every((s) => s.connections.size === 0)).toBe(true);
  });
});
