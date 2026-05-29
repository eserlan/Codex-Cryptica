with open("apps/web/src/lib/stores/world.svelte.ts", "r") as f:
    content = f.read()

replacement = """  imageGenerator: {
    generateImage: (apiKey: string, prompt: string, modelName: string) => {
      const isCustom = oracle.settings.imageProvider === "custom";
      const targetKey = isCustom && oracle.settings.customImageApiKey ? oracle.settings.customImageApiKey : apiKey;
      const targetModel = isCustom && oracle.settings.customImageModel ? oracle.settings.customImageModel : modelName;
      return imageGenerationService.generateImage(targetKey, prompt, targetModel, {
        provider: oracle.settings.imageProvider as "gemini" | "custom",
        baseUrl: oracle.settings.customImageBaseUrl
      });
    }
  },"""

import re
# regex replace the entire imageGenerator block
pattern = r"  imageGenerator: \{\s*generateImage: \(apiKey, prompt, modelName\) => \{.*?    \},\s*distillVisualPrompt: \(apiKey, query, context, modelName, demoMode\) => \{.*?    \}\s*\},"
content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open("apps/web/src/lib/stores/world.svelte.ts", "w") as f:
    f.write(content)
