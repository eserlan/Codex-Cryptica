/**
 * Key for the Lore Oracle's chat in the Interactions API session store. The
 * generator sends it with every turn and "Clear History" resets it, so both
 * must use this one helper.
 */
export function oracleConversationId(vaultId: string | null | undefined) {
  return `oracle:${vaultId}:normal`;
}
