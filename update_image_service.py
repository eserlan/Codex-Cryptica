with open("apps/web/src/lib/services/ai/image-generation.service.ts", "r") as f:
    content = f.read()

import_part = "import type { ImageGenerationService, ImageGenerationOptions } from \"schema\";"
content = content.replace("import type { ImageGenerationService } from \"schema\";", import_part)

gen_signature = "  async generateImage(\n    apiKey: string,\n    prompt: string,\n    modelName: string,\n    options?: ImageGenerationOptions,\n  ): Promise<Blob> {"

content = content.replace(
    "  async generateImage(\n    apiKey: string,\n    prompt: string,\n    modelName: string,\n  ): Promise<Blob> {",
    gen_signature
)

try_block = """    try {
      const provider = options?.provider || "gemini";
      
      if (provider === "custom") {
        console.log(`[ImageGenerationService] Generating image via custom provider: ${modelName}`);
        const customBaseUrl = options?.baseUrl || "https://api.together.xyz/v1/images/generations";
        const response = await fetch(customBaseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            prompt: prompt,
            response_format: "b64_json",
            n: 1
          }),
        });
        
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          const message = err.error?.message || response.statusText;
          throw new Error(`Custom Image Generation Error (${modelName}): ${message}`);
        }
        
        const json = await response.json();
        // Return standard rawData shape so processImageResponse can handle it,
        // or just process it inline if it's easier.
        // Wait, processImageResponse expects Gemini format. We should adapt the response.
        const b64 = json.data?.[0]?.b64_json;
        if (!b64) {
           throw new Error("No b64_json found in custom provider response");
        }
        // Mock the gemini response structure so processImageResponse works:
        rawData = {
          candidates: [{
            content: { parts: [{ inlineData: { data: b64, mimeType: "image/png" } }] }
          }]
        };
      } else if (!apiKey) {"""

content = content.replace(
    "    try {\n      if (!apiKey) {",
    try_block
)

content = content.replace(
    "        const response = await fetch(url, {",
    "        const response = await fetch(url, {"
)

with open("apps/web/src/lib/services/ai/image-generation.service.ts", "w") as f:
    f.write(content)
