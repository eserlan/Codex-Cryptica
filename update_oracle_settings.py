import re

with open("packages/oracle-engine/src/oracle-settings.svelte.ts", "r") as f:
    content = f.read()

# Chunk 1
content = content.replace(
    "  activeStyleTitle = $state<string | null>(null);",
    "  activeStyleTitle = $state<string | null>(null);\n\n  /** Image Provider Setting */\n  imageProvider = $state<\"gemini\" | \"custom\">(\"gemini\");\n  customImageBaseUrl = $state<string>(\"\");\n  customImageApiKey = $state<string>(\"\");\n  customImageModel = $state<string>(\"\");"
)

# Chunk 2
content = content.replace(
    "          this.activeStyleTitle = data.activeStyleTitle || null;",
    "          this.activeStyleTitle = data.activeStyleTitle || null;\n          this.imageProvider = data.imageProvider || \"gemini\";\n          this.customImageBaseUrl = data.customImageBaseUrl || \"\";\n          this.customImageApiKey = data.customImageApiKey || \"\";\n          this.customImageModel = data.customImageModel || \"\";"
)

# Chunk 3
content = content.replace(
    "    this.tier = tierSetting?.value ?? \"advanced\";\n    this.broadcast();",
    "    this.tier = tierSetting?.value ?? \"advanced\";\n\n    const providerSetting = await db.appSettings.get(\"image_provider\");\n    this.imageProvider = providerSetting?.value ?? \"gemini\";\n    const baseUrlSetting = await db.appSettings.get(\"custom_image_base_url\");\n    this.customImageBaseUrl = baseUrlSetting?.value ?? \"\";\n    const apiKeySetting = await db.appSettings.get(\"custom_image_api_key\");\n    this.customImageApiKey = apiKeySetting?.value ?? \"\";\n    const modelSetting = await db.appSettings.get(\"custom_image_model\");\n    this.customImageModel = modelSetting?.value ?? \"\";\n\n    this.broadcast();"
)

# Chunk 4
content = content.replace(
    "        activeStyleTitle: this.activeStyleTitle,\n      },\n    });",
    "        activeStyleTitle: this.activeStyleTitle,\n        imageProvider: this.imageProvider,\n        customImageBaseUrl: this.customImageBaseUrl,\n        customImageApiKey: this.customImageApiKey,\n        customImageModel: this.customImageModel,\n      },\n    });"
)

# Chunk 5
content = content.replace(
    "    this.broadcast();\n  }\n\n  /**\n   * Sets the user's API key",
    "    this.broadcast();\n  }\n\n  /**\n   * Sets the custom image provider settings.\n   */\n  async setCustomImageSettings(settings: {\n    provider?: \"gemini\" | \"custom\";\n    baseUrl?: string;\n    apiKey?: string;\n    model?: string;\n  }) {\n    if (this.db) {\n      if (settings.provider !== undefined) await this.db.appSettings.put({ key: \"image_provider\", value: settings.provider, updatedAt: Date.now() });\n      if (settings.baseUrl !== undefined) await this.db.appSettings.put({ key: \"custom_image_base_url\", value: settings.baseUrl, updatedAt: Date.now() });\n      if (settings.apiKey !== undefined) await this.db.appSettings.put({ key: \"custom_image_api_key\", value: settings.apiKey, updatedAt: Date.now() });\n      if (settings.model !== undefined) await this.db.appSettings.put({ key: \"custom_image_model\", value: settings.model, updatedAt: Date.now() });\n    }\n    if (settings.provider !== undefined) this.imageProvider = settings.provider;\n    if (settings.baseUrl !== undefined) this.customImageBaseUrl = settings.baseUrl;\n    if (settings.apiKey !== undefined) this.customImageApiKey = settings.apiKey;\n    if (settings.model !== undefined) this.customImageModel = settings.model;\n    this.broadcast();\n  }\n\n  /**\n   * Sets the user's API key"
)

# Chunk 6
content = content.replace(
    "      activeStyleTitle: this.activeStyleTitle,\n      connectionMode: this.connectionMode,\n    };\n  }",
    "      activeStyleTitle: this.activeStyleTitle,\n      connectionMode: this.connectionMode,\n      imageProvider: this.imageProvider,\n      customImageBaseUrl: this.customImageBaseUrl,\n      customImageApiKey: this.customImageApiKey,\n      customImageModel: this.customImageModel,\n    };\n  }"
)

# Chunk 7
content = content.replace(
    "    if (updates.activeStyleTitle !== undefined)\n      this.setStyle(updates.activeStyleTitle);\n  }",
    "    if (updates.activeStyleTitle !== undefined)\n      this.setStyle(updates.activeStyleTitle);\n\n    await this.setCustomImageSettings({\n      provider: updates.imageProvider,\n      baseUrl: updates.customImageBaseUrl,\n      apiKey: updates.customImageApiKey,\n      model: updates.customImageModel,\n    });\n  }"
)

with open("packages/oracle-engine/src/oracle-settings.svelte.ts", "w") as f:
    f.write(content)
