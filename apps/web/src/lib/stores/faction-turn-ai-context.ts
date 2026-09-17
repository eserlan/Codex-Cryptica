import type { Entity } from "schema";
import type { FactionAiParticipantLore } from "@codex/ai-engine";

/** Privacy and prompt-size bound for one participant's expanded context. */
export const MAX_PARTICIPANT_LORE_CHARS = 1200;
export const MAX_PARTICIPANT_CONNECTIONS = 5;

/**
 * Builds the optional, local-only context that a GM has chosen to share with
 * their AI provider. Unknown or deleted connection targets are omitted rather
 * than sending an internal id the model cannot use.
 */
export function buildParticipantLore(
  participant: Entity,
  allEntities: Entity[],
): FactionAiParticipantLore {
  const entityTitles = new Map(
    allEntities.map((entity) => [entity.id, entity.title]),
  );
  const lore = [participant.content.trim(), participant.lore?.trim()]
    .filter((part): part is string => Boolean(part))
    .join("\n\n")
    .slice(0, MAX_PARTICIPANT_LORE_CHARS);

  return {
    aliases: participant.aliases,
    lore,
    connections: participant.connections
      .flatMap((connection) => {
        const entityTitle = entityTitles.get(connection.target);
        return entityTitle
          ? [
              {
                entityTitle,
                type: connection.type,
                strength: connection.strength,
              },
            ]
          : [];
      })
      .slice(0, MAX_PARTICIPANT_CONNECTIONS),
  };
}
