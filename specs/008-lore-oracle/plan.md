# Plan: Lore Oracle (Cloud Opt-In)

## Overview
Integrate Google Gemini via `@google/generative-ai` to provide a lightweight, accessible AI chat interface. This replaces the previous Local/WebLLM plan.

## Architecture

### 1. The Brain (`GeminiService`)
- **Library**: `@google/generative-ai`
- **Model**: `gemini-1.5-flash` (Fast, cheap/free, large context).
- **Authentication**: User-provided API Key stored in IndexedDB via `idb` settings (see `idb.ts`).

### 2. The Retrieval (`RAG`)
- **Query**: User input -> `SearchService.search(query)`.
- **Context**: Top 5-10 results from search are read from `VaultStore` (content).
- **Prompt**:
  ```text
  System: You are the Lore Oracle. Answer based ONLY on the provided context.
  Context: {file_content_1} ... {file_content_n}
  Question: {user_query}
  ```

## Dependencies
- `@google/generative-ai`
- (Remove) `@mlc-ai/web-llm`

## Proposed Changes

### Frontend (`apps/web`)
- **`src/lib/services/ai.ts`**: Wrapper for Google Generative AI.
- **`src/lib/stores/settings.svelte.ts`**: Update to manage API keys secure persistence.
- **`src/lib/components/settings/AISettings.svelte`**: New component to input API Key.
- **`src/lib/components/oracle/OracleWindow.svelte`**: Chat interface (conditionally enabled).

## Risks
- **Data Privacy**: Users sending lore to Google. Must be clearly labeled "Opt-In".
- **API Limits**: Free tier rate limits. Handle 429 errors gracefully.