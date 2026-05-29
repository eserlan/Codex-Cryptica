# Specification: Third-Party Image Provider

## 1. Description
Users need the ability to configure an OpenAI-compatible third-party image generation API (such as Together AI, Fireworks, or Fal.ai) instead of being locked into the Google Gemini API. This allows users to leverage extremely cost-effective models like FLUX.1-schnell, reducing image generation costs significantly.

## 2. Goals & Success Criteria

### Goals
* Allow users to bypass the Gemini image generation API for third-party providers.
* Support standard OpenAI-compatible `/v1/images/generations` endpoints.
* Allow users to configure the base URL, API key, and specific model name for the image provider.

### Success Criteria
* Users can successfully generate entity cover images and chat visualizations using an alternative provider.
* Users can input their custom Base URL, API key, and Model Name in the Oracle settings UI.
* The system correctly parses the standard `b64_json` response from the OpenAI-compatible endpoint.

## 3. Assumptions & Constraints
* The third-party API endpoint will adhere to the standard OpenAI image generation payload (`model`, `prompt`, `response_format: "b64_json"`) and response format.
* The Google Gemini API remains the default option if no custom provider is configured.
* Text generation and context tasks will remain on the Gemini API; this feature strictly overrides the image generation provider.

## 4. User Scenarios

**Scenario 1: Configuring Together AI for FLUX**
* **Context**: A user wants to drastically cut costs by using Together AI's hosted Flux model.
* **Action**: They open the Oracle settings, switch the Image Provider to "Custom", enter `https://api.together.xyz/v1/images/generations` as the base URL, enter their Together API key, and set the model to `black-forest-labs/FLUX.1-schnell`.
* **Result**: Subsequent image generation requests route to Together AI, returning high-quality images at a fraction of the cost.

## 5. Functional Requirements
* **FR-1**: The Settings UI must include fields for "Image Provider" (Gemini vs Custom), "Custom Base URL", "Custom API Key", and "Custom Model Name".
* **FR-2**: The `ImageGenerationService` must route requests to the specified base URL if "Custom" provider is selected.
* **FR-3**: The payload sent to the custom provider must follow the standard OpenAI `v1/images/generations` shape.
* **FR-4**: The custom image response parser must extract the `b64_json` image payload and correctly map it to the application's internal image handling.
* **FR-5**: If the custom provider request fails, a clear error should be bubbled up to the user.

## 6. Out of Scope
* Integration with providers that do not support the OpenAI-compatible REST API format (e.g., custom SDKs).
* Changing the text generation API (this is strictly for image generation).
