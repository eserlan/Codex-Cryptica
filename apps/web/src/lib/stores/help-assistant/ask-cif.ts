import { cifPopout, helpAssistant } from "./help-runtime";

/**
 * Opens Cif (the pop-out when it is open, otherwise the docked panel) and asks
 * a verified prompt. It is the only request path for guided setup and tips, and
 * it runs only after the person taps (spec 175 FR-014, spec 176 FR-017).
 */
export function askCifPrompt(prompt: string): void {
  if (cifPopout.connected) cifPopout.open();
  else helpAssistant.open();
  void helpAssistant.ask(prompt);
}
