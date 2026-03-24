import { DEFAULT_CATEGORIES, type Category } from "schema";
import { getDB } from "../utils/idb";

export interface ICategoryStorage {
  load(): Promise<Category[] | undefined>;
  save(categories: Category[]): Promise<void>;
}

export class CategoryStore {
  list = $state<Category[]>(DEFAULT_CATEGORIES);
  isLoaded = $state(false);

  constructor(
    private storage: ICategoryStorage = {
      async load() {
        const db = await getDB();
        return await db.get("settings", "categories");
      },
      async save(list) {
        const db = await getDB();
        await db.put("settings", $state.snapshot(list), "categories");
      },
    },
  ) {}

  async init() {
    if (this.isLoaded) return;

    try {
      const stored = await this.storage.load();
      if (stored && Array.isArray(stored)) {
        // Merge Logic: Keep user-customized/added categories,
        // but ensure all CURRENT defaults are also present.
        const merged = [...stored];
        DEFAULT_CATEGORIES.forEach((defaultCat) => {
          if (!merged.some((c) => c.id === defaultCat.id)) {
            merged.push(defaultCat);
          }
        });
        this.list = merged;
      }
    } catch (e) {
      console.error("Failed to load categories", e);
    } finally {
      this.isLoaded = true;
    }
  }

  async save() {
    try {
      await this.storage.save(this.list);
    } catch (e) {
      console.error("Failed to save categories", e);
    }
  }

  addCategory(category: Category) {
    // Prevent duplicate category IDs by updating existing entries instead of pushing duplicates.
    const existingIndex = this.list.findIndex((c) => c.id === category.id);
    if (existingIndex !== -1) {
      // Use updateCategory to preserve centralized update logic.
      this.updateCategory(category.id, category);
      return;
    }
    this.list.push(category);
    void this.save();
  }

  updateCategory(id: string, updates: Partial<Category>) {
    const index = this.list.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.list[index] = { ...this.list[index], ...updates };
      void this.save();
    }
  }

  removeCategory(id: string) {
    this.list = this.list.filter((c) => c.id !== id);
    void this.save();
  }

  resetToDefaults() {
    this.list = [...DEFAULT_CATEGORIES];
    void this.save();
  }

  getCategory(id: string): Category | undefined {
    return this.list.find((c) => c.id === id);
  }

  getColor(id: string): string {
    return this.getCategory(id)?.color || "#15803d"; // Fallback to Scifi Green
  }
}

export const categories = new CategoryStore();

if (
  typeof window !== "undefined" &&
  (import.meta.env.DEV || (window as any).__E2E__)
) {
  (window as any).categories = categories;
  console.log("[CategoryStore] Module loaded, categories attached to window");
}
