import re
with open("packages/oracle-engine/src/oracle-generator.ts", "r") as f:
    content = f.read()

# Revert previous script
content = content.replace(
    "    return await context.imageGeneration.generateImage(\n      apiKey,\n      visualPrompt,\n      \"gemini-2.5-flash-image\",\n      {\n        provider: context.imageProvider,\n        baseUrl: context.customImageBaseUrl\n      }\n    );",
    "    return await context.imageGeneration.generateImage(\n      apiKey,\n      visualPrompt,\n      \"gemini-2.5-flash-image\",\n    );"
)

pattern = r"    return await context\.imageGeneration\.generateImage\(\s*apiKey,\s*visualPrompt,\s*\"gemini-2\.5-flash-image\",\s*\);"
replacement = """    const targetKey = context.imageProvider === "custom" && context.customImageApiKey ? context.customImageApiKey : apiKey;
    const targetModel = context.imageProvider === "custom" && context.customImageModel ? context.customImageModel : "gemini-2.5-flash-image";
    return await context.imageGeneration.generateImage(
      targetKey,
      visualPrompt,
      targetModel,
      {
        provider: context.imageProvider,
        baseUrl: context.customImageBaseUrl
      }
    );"""

content = re.sub(pattern, replacement, content)

with open("packages/oracle-engine/src/oracle-generator.ts", "w") as f:
    f.write(content)
