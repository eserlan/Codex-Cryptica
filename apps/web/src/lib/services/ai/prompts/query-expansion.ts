export function buildQueryExpansionPrompt(
  conversationContext: string,
  query: string,
): string {
  return `Given the following conversation history and a new user query, re-write the query into a standalone, descriptive search term that captures the user's intent. 
Focus on resolving pronouns (he, she, it, they, that place) based on the history.
If the query is already standalone, return it as is.

CONVERSATION HISTORY:
${conversationContext}

USER QUERY: ${query}

STANDALONE SEARCH QUERY:`;
}
