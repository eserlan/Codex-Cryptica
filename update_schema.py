with open("packages/schema/src/ai.ts", "r") as f:
    content = f.read()

content = content.replace(
    "export interface ImageGenerationService {\n  generateImage(\n    apiKey: string,\n    prompt: string,\n    modelName: string,\n  ): Promise<Blob>;",
    "export interface ImageGenerationOptions {\n  provider?: \"gemini\" | \"custom\";\n  baseUrl?: string;\n}\n\nexport interface ImageGenerationService {\n  generateImage(\n    apiKey: string,\n    prompt: string,\n    modelName: string,\n    options?: ImageGenerationOptions,\n  ): Promise<Blob>;"
)

with open("packages/schema/src/ai.ts", "w") as f:
    f.write(content)
