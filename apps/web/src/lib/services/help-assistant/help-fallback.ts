import {
  FEATURE_REGISTRY,
  featureMatchesScreen,
  type FeatureEntry,
  type HelpContext,
} from "help-engine";
import type { HelpClientError } from "./help-client";

export interface HelpTopicLink {
  helpId: string;
  title: string;
}

export interface HelpFallback {
  message: string;
  /** Static help for the current screen. Empty means "point to the help library". */
  topics: HelpTopicLink[];
  /** When there is no screen-specific topic, the panel offers the whole library. */
  showLibrary: boolean;
}

export interface FallbackDeps {
  features?: readonly FeatureEntry[];
  /** Title of an in-app help article, or null if it is not available. */
  titleFor: (helpId: string) => string | null;
}

const MAX_TOPICS = 3;

/** Plain-language message for each way asking can fail. */
export function fallbackMessage(error: HelpClientError): string {
  switch (error.kind) {
    case "offline":
      return "You're offline, so the help assistant can't answer right now. The help for this screen is still here:";
    case "rate-limited":
      return "That's a lot of questions in a short time. Wait a moment and try again. In the meantime, the help for this screen is here:";
    case "timeout":
      return "I couldn't get an answer in time. The help for this screen is here:";
    case "bad-request":
      if (error.code === "QUESTION_TOO_LONG") {
        return "Questions can be up to 500 characters. Try a shorter one.";
      }
      if (error.code === "EMPTY_QUESTION")
        return "Type a question to get help.";
      return "I couldn't use that question. Try asking it another way. The help for this screen is here:";
    case "aborted":
      return "";
    default:
      return "I couldn't reach the help assistant just now. The help for this screen is here:";
  }
}

/**
 * Static help for the screen the user is on, for when the assistant cannot
 * answer. It needs no network: it reads the bundled registry and the in-app
 * help articles, so help never disappears with the connection.
 */
export function buildFallback(
  error: HelpClientError,
  context: HelpContext,
  deps: FallbackDeps,
): HelpFallback {
  const features = deps.features ?? FEATURE_REGISTRY;
  const seen = new Set<string>();
  const topics: HelpTopicLink[] = [];
  for (const feature of features) {
    if (!featureMatchesScreen(feature, context)) continue;
    for (const helpId of feature.helpIds) {
      if (seen.has(helpId) || topics.length >= MAX_TOPICS) continue;
      const title = deps.titleFor(helpId);
      if (!title) continue;
      seen.add(helpId);
      topics.push({ helpId, title });
    }
  }
  return {
    message: fallbackMessage(error),
    topics,
    showLibrary: topics.length === 0,
  };
}
