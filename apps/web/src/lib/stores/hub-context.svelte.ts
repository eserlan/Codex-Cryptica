export class HubContextStore {
  #theme = $state<string | null>(null);

  get theme(): string | null {
    return this.#theme;
  }

  set(theme: string | null) {
    this.#theme = theme;
  }
}

export const hubContext = new HubContextStore();
