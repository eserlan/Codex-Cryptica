export interface LightboxOriginRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LightboxState {
  show: boolean;
  imageUrl: string;
  title?: string;
  originRect?: LightboxOriginRect | null;
  imagePath?: string;
}

export class LightboxStore {
  state = $state<LightboxState>({
    show: false,
    imageUrl: "",
    originRect: null,
    imagePath: "",
  });

  open(
    imageUrl: string,
    title?: string,
    originRect?: LightboxOriginRect | null,
    imagePath?: string,
  ) {
    this.state = {
      show: true,
      imageUrl,
      title,
      originRect: originRect ?? null,
      imagePath: imagePath ?? "",
    };
  }

  close() {
    this.state.show = false;
    this.state.originRect = null;
    this.state.imagePath = "";
  }
}

const KEY = "__codex_lightbox_store__v1__";
const globalScope = globalThis as unknown as Record<
  string,
  LightboxStore | undefined
>;
export const lightboxStore: LightboxStore =
  globalScope[KEY] ?? (globalScope[KEY] = new LightboxStore());
