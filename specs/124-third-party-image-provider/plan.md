# Implementation Plan: Third-Party Image Provider

## 1. High-Level Approach
We will introduce a configurable "Image Provider" setting. When set to `custom`, the `ImageGenerationService` will build a payload compatible with OpenAI's `/v1/images/generations` format and post it to the user-defined `imageGenerationBaseUrl`. 

## 2. Changes Needed

### 2.1 Settings State Update
*   **File:** `packages/oracle-engine/src/oracle-settings.svelte.ts`
*   **Changes:**
    *   Add `imageProvider: "gemini" | "custom"` (default `"gemini"`).
    *   Add `imageGenerationBaseUrl: string` (default `""`).
    *   Add `imageGenerationApiKey: string` (default `""`).
    *   Add `imageGenerationModel: string` (default `""`).

### 2.2 Settings UI Component Update
*   **File:** `apps/web/src/lib/components/oracle/OracleSettings.svelte`
*   **Changes:**
    *   Add a toggle/select for the Image Provider.
    *   If `custom` is selected, reveal text inputs for Base URL, API Key, and Model Name.
    *   Bind these inputs to the `oracle.settings` properties added in 2.1.

### 2.3 Image Generation Service Modification
*   **File:** `apps/web/src/lib/services/ai/image-generation.service.ts`
*   **Changes:**
    *   Modify `generateImage` to accept the new provider configurations, or simply check the global `oracle.settings` (or pass it via args if it's injected). Wait, `generateImage` signature might just take the necessary parameters. We'll update the arguments/signature to allow passing the provider, custom URL, custom key, and custom model.
    *   If `provider === "custom"`, issue a `fetch` POST to `customBaseUrl` with:
        ```json
        {
          "model": customModel,
          "prompt": prompt,
          "response_format": "b64_json",
          "n": 1
        }
        ```
    *   Parse the JSON response and return `response.data[0].b64_json`.

### 2.4 Generator Services
*   **File:** `packages/oracle-engine/src/oracle-generator.ts` and `apps/web/src/lib/stores/world.svelte.ts`
*   **Changes:**
    *   Update calls to `imageGeneration.generateImage()` to pass the necessary custom parameters retrieved from `oracle.settings`.

## 3. Risks & Edge Cases
*   **CORS Issues:** The custom API might block direct browser requests. Users would need to use a proxy, or providers like Together AI might allow browser requests if CORS is configured or permitted by their API. We will document this.
*   **Payload Variability:** Not all OpenAI-compatible endpoints strictly adhere to `b64_json`. We'll assume strict compliance as an MVP.
