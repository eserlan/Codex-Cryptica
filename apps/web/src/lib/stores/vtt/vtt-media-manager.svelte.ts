import type {
  SharedTokenImageState,
  VTTMessage,
  Token,
} from "../../../types/vtt";
import type { VaultStore } from "../vault.svelte";
import { debugStore } from "../debug.svelte";

export interface VTTMediaDependencies {
  emit: (message: VTTMessage) => void;
  getTokens: () => Record<string, Token>;
  getVault: () => VaultStore;
}

export class VTTMediaManager {
  sharedTokenImage = $state<SharedTokenImageState | null>(null);

  constructor(private deps: VTTMediaDependencies) {}

  reset() {
    this.sharedTokenImage = null;
  }

  handleRemoteShowTokenImage(title: string, imagePath: string) {
    this.sharedTokenImage = {
      title,
      imagePath,
    };
  }

  clearSharedTokenImage() {
    this.sharedTokenImage = null;
  }

  showTokenImageToPlayers(tokenId: string) {
    const tokens = this.deps.getTokens();
    const token = tokens[tokenId];
    if (!token) {
      console.warn("[MapSession] showTokenImageToPlayers missing token", {
        tokenId,
      });
      return false;
    }

    const vault = this.deps.getVault();
    const entityImage = token.entityId
      ? (vault.entities[token.entityId]?.image ?? null)
      : null;
    const imagePath = entityImage ?? token.imageUrl;
    if (!imagePath) {
      console.warn("[MapSession] showTokenImageToPlayers missing image", {
        tokenId,
        tokenImageUrl: token.imageUrl,
        entityId: token.entityId,
        entityImage,
      });
      return false;
    }

    debugStore.log("[MapSession] showTokenImageToPlayers", {
      tokenId,
      title: token.name,
      imagePath,
      tokenImageUrl: token.imageUrl,
      entityImage,
    });

    this.deps.emit({
      type: "SHOW_TOKEN_IMAGE",
      title: token.name,
      imagePath,
    });

    return true;
  }

  showImageToPlayers(title: string, imagePath: string) {
    if (!imagePath) {
      console.warn("[MapSession] showImageToPlayers missing imagePath");
      return false;
    }

    debugStore.log("[MapSession] showImageToPlayers", {
      title,
      imagePath,
    });

    this.deps.emit({
      type: "SHOW_TOKEN_IMAGE",
      title,
      imagePath,
    });

    return true;
  }
}
