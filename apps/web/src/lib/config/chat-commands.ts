import { oracle } from "../stores/oracle.svelte";

export interface ChatCommand {
  name: string;
  description: string;
  parameters?: string[];
  handler: (args: string) => Promise<void> | void;
}

export const chatCommands: ChatCommand[] = [
  {
    name: "/draw",
    description: "Visualize something with AI",
    parameters: ["[subject]"],
    handler: (subject) => oracle.ask(`/draw ${subject}`),
  },
  {
    name: "/create",
    description: "Create a new record with AI",
    parameters: ["[description]"],
    handler: (desc) => oracle.ask(`/create ${desc}`),
  },
  {
    name: "/connect",
    description: "Link entities with AI guidance",
    parameters: ["oracle"],
    handler: (args) => {
      if (args.trim().toLowerCase() === "oracle") {
        oracle.startWizard("connection");
      } else {
        oracle.ask(`/connect ${args}`);
      }
    },
  },
  {
    name: "/merge",
    description: "Merge entities with AI guidance",
    parameters: ["source", "into", "target"],
    handler: (args) => {
      if (args.trim().toLowerCase() === "oracle") {
        oracle.startWizard("merge");
      } else {
        oracle.ask(`/merge ${args}`);
      }
    },
  },
  {
    name: "/help",
    description: "Show available commands",
    handler: () => oracle.showHelp(),
  },
  {
    name: "/clear",
    description: "Clear conversation history",
    handler: () => {
      if (confirm("Are you sure you want to clear the conversation history?")) {
        oracle.clearMessages();
      }
    },
  },
];
