import {
  runHeistGeneration,
  type HeistPrompt,
  type PublicGeneratorOutput,
} from "generator-engine";
import type { GeneratorAITransport } from "./generator-ai-transport";

type HeistChat = Awaited<ReturnType<GeneratorAITransport["startChat"]>>;

type StartChat = (systemInstruction: string) => Promise<HeistChat>;
type SendChatMessage = (
  chat: HeistChat,
  userMessage: string,
) => Promise<string>;

/** Runs the SEO heist's generation and independent review conversations. */
export async function runSeoHeistGeneration(
  prompt: HeistPrompt,
  startChat: StartChat,
  sendChatMessage: SendChatMessage,
): Promise<PublicGeneratorOutput> {
  const generationChat = await startChat(prompt.systemInstruction);
  let reviewChatPromise: Promise<HeistChat> | undefined;
  const result = await runHeistGeneration(prompt, {
    generate: (message) => sendChatMessage(generationChat, message),
    review: async (message) =>
      sendChatMessage(
        await (reviewChatPromise ??= startChat(prompt.systemInstruction)),
        message,
      ),
  });
  return result.output;
}
