import { MAX_CONVERSATION_TURNS } from "generator-engine";

/**
 * One source of truth for what the Idea Developer tells people about their
 * idea (#3228, FR-038 and FR-039). The inline notice, the help entry and the
 * privacy page all read from here so they cannot drift apart.
 *
 * The AI service holds the conversation while it continues so earlier turns do
 * not have to be sent again. Codex Cryptica keeps nothing. Ending a
 * conversation clears this tab's copy; it does not promise the service has
 * erased what it already received.
 */
export const IDEA_DEVELOPER_COPY = {
  notice: {
    text: "Your idea is sent to an AI service to write the response. The service keeps this conversation while you continue, so earlier turns are not sent again. Codex Cryptica does not keep it. Start a new conversation to stop continuing this one.",
    privacyHref: "/privacy",
    privacyLabel: "What happens to my idea?",
    helpLabel: "How this works",
  },
  help: {
    title: "Idea Developer",
    body: `Paste an RPG idea and the Idea Developer develops it instead of replacing it: what is already interesting, the central question, pressure, people who care, things the players could do, and what happens if nobody steps in. You can keep going by answering its questions, asking for a change, or switching between Assess and Develop, for up to ${MAX_CONVERSATION_TURNS} turns in a conversation. Your idea is sent to an AI service to write the response. The service keeps this conversation while you continue, so earlier turns are not sent again. Codex Cryptica does not keep it. This tab remembers your idea and the latest result until you close the tab. Start a new conversation or clear to remove what this tab has kept and stop continuing the old conversation. That does not promise the AI service has erased what it already received; its own retention period applies (currently about 30 days). If you choose Save to your Codex, a copy of that draft is also kept in this browser until the app imports it.`,
  },
  privacy: {
    heading: "What happens to my idea?",
    paragraphs: [
      "When you use the Idea Developer, your idea and any follow-up you type are sent to an AI service to write each response. The service keeps this conversation while you continue, so earlier turns are not sent again. Codex Cryptica does not keep it.",
      "Your browser tab keeps your idea, the turns so far and the latest result until you close the tab. Start a new conversation or clear to remove that copy and stop continuing the old conversation. That does not promise the AI service has erased what it already received; its own retention period applies (currently about 30 days). If you choose Save to your Codex, a copy of that draft is also kept in this browser until the app imports it.",
      "If you choose to share a draft from the Session Hub, that text is sent to Codex Cryptica's snapshot service, and only then.",
    ],
  },
} as const;
