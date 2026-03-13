import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

class AIClientManager {
  private client: GoogleGenerativeAI | null = null;
  private currentKey: string | null = null;

  getClient(apiKey: string): GoogleGenerativeAI {
    if (!this.client || this.currentKey !== apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
      this.currentKey = apiKey;
    }
    return this.client;
  }

  getModel(apiKey: string, modelName: string, systemInstruction?: string): GenerativeModel {
    const client = this.getClient(apiKey);
    return client.getGenerativeModel({
      model: modelName,
      systemInstruction,
    });
  }
}

export const aiClientManager = new AIClientManager();
