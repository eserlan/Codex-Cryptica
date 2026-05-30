# Specification: Third-Party Image Provider

## 1. Description

Users need the ability to configure alternative image generation options instead of being locked into the Google Gemini API. This specification establishes Cloudflare Workers AI using the Stable Diffusion XL (SDXL) model as the default image generation option for Codex Cryptica. It routes requests automatically through the system proxy (subject to daily limits) to provide zero-config, high-quality, painterly image generation. Users can also configure a custom OpenAI-compatible API key/endpoint (e.g. Together AI, Fireworks) as an alternative.

## 2. Goals & Success Criteria

### Goals

- Allow users to bypass the Gemini image generation API for third-party providers.
- Route default image generation to Cloudflare Workers AI (SDXL) via the system proxy.
- Enforce a daily generation limit on the proxy to prevent resource abuse.
- Support standard OpenAI-compatible `/v1/images/generations` endpoints for custom providers.

### Success Criteria

- Cloudflare Workers AI is the default option and works without requiring any user-provided tokens.
- Users can successfully generate cover images and chat visualizations using the default Cloudflare provider.
- The system proxy enforces a 40 images/day limit per user IP using the Cache API.
- Users can input custom Base URL, API key, and Model Name in settings for custom OpenAI-compatible endpoints.

## 3. Assumptions & Constraints

- The Google Gemini API remains an option if the user provides their own Gemini API key.
- Text generation and context tasks remain on the Gemini API; this strictly overrides the image generation provider.
- Cloudflare Workers AI requests run through the system proxy to avoid exposing API tokens on the client side.

## 4. User Scenarios

**Scenario 1: Generating images via Cloudflare (Default)**

- **Context**: A user wants zero-config image generation.
- **Action**: They open the app. The default Image Provider is set to "Cloudflare Workers AI".
- **Result**: Subsequent image generation requests route to the system proxy, which runs the prompt on SDXL. The user does not need to enter any API keys, but is subject to a 40/day limit.

**Scenario 2: Configuring Custom Provider**

- **Context**: A user wants to use their own Together AI key for FLUX.
- **Action**: They change the Image Provider in settings to "Custom", enter their Together AI endpoint, API Key, and model name.
- **Result**: Requests bypass the proxy and hit Together AI directly.

## 5. Functional Requirements

- **FR-1**: The Settings UI must let users choose between "Cloudflare Workers AI", "Google Gemini" (requires own key), and "Custom".
- **FR-2**: Selecting "Cloudflare" must not show any configuration fields; it routes requests to the proxy on `/v1/images/generations`.
- **FR-3**: The proxy must limit requests to 40 per IP per day using the Cloudflare Cache API, and call the `@cf/stabilityai/stable-diffusion-xl-base-1.0` model.
- **FR-4**: If the custom provider is selected, the client must require a custom API key and direct requests to the custom base URL.

## 6. Out of Scope

- Support for non-standard APIs that do not adhere to OpenAI's payload shape or Cloudflare Workers AI formats.
- Modifying text generation endpoints (this strictly overrides image generation).
