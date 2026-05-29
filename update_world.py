with open("apps/web/src/lib/stores/world.svelte.ts", "r") as f:
    content = f.read()

replacement = """  imageGenerator: {
    generateImage: (apiKey, prompt, modelName) => {
      const isCustom = oracle.settings.imageProvider === "custom";
      const targetKey = isCustom && oracle.settings.customImageApiKey ? oracle.settings.customImageApiKey : apiKey;
      const targetModel = isCustom && oracle.settings.customImageModel ? oracle.settings.customImageModel : modelName;
      return imageGenerationService.generateImage(targetKey, prompt, targetModel, {
        provider: oracle.settings.imageProvider as "gemini" | "custom",
        baseUrl: oracle.settings.customImageBaseUrl
      });
    },
    distillVisualPrompt: (apiKey, query, context, modelName, demoMode) => {
      return imageGenerationService.distillVisualPrompt(apiKey, query, context, modelName, demoMode);
    }
  },"""

content = content.replace("  imageGenerator: imageGenerationService,", replacement)

with open("apps/web/src/lib/stores/world.svelte.ts", "w") as f:
    f.write(content)
