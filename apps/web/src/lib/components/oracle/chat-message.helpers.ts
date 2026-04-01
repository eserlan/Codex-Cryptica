import type { ChatMessage } from "$lib/stores/oracle.svelte";

const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto|tel|data|blob):|[^&#?./]?(?:[#/?]|$))/i;

export interface ParsedChatMessage {
  title?: string | null;
  type?: string | null;
  chronicle?: string | null;
  lore?: string | null;
  connections?: Array<string | { target?: string; label?: string }> | undefined;
  image?: string | null;
  thumbnail?: string | null;
  wasSplit?: boolean;
}

export interface HtmlParserLike {
  parse(content: string): Promise<string>;
}

export interface DomPurifyLike {
  sanitize(html: string, options?: { ALLOWED_URI_REGEXP?: RegExp }): string;
}

export const LORE_THRESHOLD = 400;

export function getTargetEntityId(
  message: {
    archiveTargetId?: string | null;
    entityId?: string | null;
  },
  activeEntityId: string | null,
): string | null {
  return message.archiveTargetId || message.entityId || activeEntityId;
}

export function canOverrideTarget(
  targetEntityId: string | null,
  activeEntityId: string | null,
): boolean {
  return !!activeEntityId && targetEntityId !== activeEntityId;
}

export function isLoreMessage(
  message: Pick<ChatMessage, "id" | "content">,
  messages: Pick<ChatMessage, "id" | "role" | "content">[],
): boolean {
  const msgIndex = messages.findIndex((entry) => entry.id === message.id);
  if (msgIndex > 0) {
    const prevMsg = messages[msgIndex - 1];
    if (prevMsg.role === "user") {
      const query = (prevMsg.content || "").toLowerCase();
      if (
        query.includes("blurb") ||
        query.includes("chronicle") ||
        query.includes("short desc")
      ) {
        return false;
      }
      if (
        query.includes("expansive") ||
        query.includes("detailed") ||
        query.includes("lore") ||
        query.includes("deep dive")
      ) {
        return true;
      }
    }
  }

  return (message.content?.length ?? 0) >= LORE_THRESHOLD;
}

export function shouldShowActions(
  message: Pick<ChatMessage, "role" | "type" | "content">,
  parsed: Pick<ParsedChatMessage, "title" | "wasSplit">,
  isLoading: boolean,
): boolean {
  if (message.role !== "assistant") return false;
  if (
    message.type === "image" ||
    message.type === "roll" ||
    message.type === "wizard"
  ) {
    return false;
  }

  if (parsed.wasSplit || (parsed.title && parsed.title.length > 3)) {
    return true;
  }

  if (
    !isLoading &&
    message.content &&
    message.content.length > LORE_THRESHOLD
  ) {
    return true;
  }

  return false;
}

export function shouldShowCreateAction(
  parsed: Pick<ParsedChatMessage, "title">,
  alreadyExists: boolean,
  isSaved: boolean,
): boolean {
  return !!parsed.title && !alreadyExists && !isSaved;
}

export async function renderMessageHtml(
  content: string,
  parser: HtmlParserLike,
  isBrowser: boolean,
  domPurify: DomPurifyLike,
): Promise<string> {
  const html = await parser.parse(content);

  return isBrowser
    ? domPurify.sanitize(html, {
        ALLOWED_URI_REGEXP,
      })
    : html;
}
