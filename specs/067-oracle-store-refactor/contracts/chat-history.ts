export interface IChatHistoryService {
  messages: ChatMessage[];
  lastUpdated: number;

  init(): Promise<void>;
  addMessage(msg: ChatMessage): Promise<void>;
  removeMessage(id: string): Promise<void>;
  clearMessages(): Promise<void>;
  saveToDB(): Promise<void>;
  broadcast(): void;
  syncFromBroadcast(data: any): void;
}
