import { describe, expect, it, vi } from "vitest";
import { buildHeistPrompt, generateHeistLocal } from "generator-engine";
import { runSeoHeistGeneration } from "./heist-generation-orchestration";

const responseStream = (text: string) =>
  Promise.resolve({
    stream: (async function* () {
      yield { text: () => text };
    })(),
  });

const prompt = buildHeistPrompt({ heistType: "Rescue" }, "", () => 0.5);

describe("runSeoHeistGeneration", () => {
  it("creates the reviewer lazily and reuses it for audit and repair", async () => {
    const local = generateHeistLocal({ heistType: "Rescue" });
    const initial = JSON.stringify({
      ...local,
    });
    const audit = JSON.stringify({
      verdict: "repair",
      fullScore: "Escape with the objective.",
      transitions: [
        {
          event: "The objective moves",
          stateBefore: "Objective secured",
          stateAfter: "Objective with crew",
          factsChanged: ["objective.location: secured -> with crew"],
        },
      ],
      issues: [
        {
          id: "state-1",
          sections: ["The Getaway"],
          problem: "A later fact is stale.",
          requiredFact: "The objective is with the crew.",
        },
      ],
    });
    const chats = [
      {
        sendMessageStream: vi.fn().mockReturnValueOnce(responseStream(initial)),
      },
      {
        sendMessageStream: vi
          .fn()
          .mockReturnValueOnce(responseStream(audit))
          .mockReturnValueOnce(responseStream(initial)),
      },
    ];
    const startChat = vi
      .fn()
      .mockResolvedValueOnce(chats[0])
      .mockResolvedValueOnce(chats[1]);
    const sendChatMessage = async (chat: any, message: string) => {
      const result = await chat.sendMessageStream(message);
      let text = "";
      for await (const chunk of result.stream) text += chunk.text();
      return text;
    };

    const output = await runSeoHeistGeneration(
      prompt,
      startChat,
      sendChatMessage,
    );

    expect(startChat).toHaveBeenCalledTimes(2);
    expect(chats[0].sendMessageStream).toHaveBeenCalledTimes(1);
    expect(chats[1].sendMessageStream).toHaveBeenCalledTimes(2);
    expect(output.title).toBe(local.title);
  });

  it("keeps the initial draft when the optional review conversation fails", async () => {
    const initial = JSON.stringify(generateHeistLocal({ heistType: "Rescue" }));
    const generationChat = {
      sendMessageStream: vi.fn().mockReturnValueOnce(responseStream(initial)),
    };
    const startChat = vi
      .fn()
      .mockResolvedValueOnce(generationChat)
      .mockRejectedValueOnce(new Error("review unavailable"));
    const sendChatMessage = async (chat: any, message: string) => {
      const result = await chat.sendMessageStream(message);
      let text = "";
      for await (const chunk of result.stream) text += chunk.text();
      return text;
    };

    const output = await runSeoHeistGeneration(
      prompt,
      startChat,
      sendChatMessage,
    );

    expect(output).toMatchObject({
      title: initial && JSON.parse(initial).title,
    });
    expect(startChat).toHaveBeenCalledTimes(2);
  });
});
