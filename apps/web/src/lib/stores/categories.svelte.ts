import { DEFAULT_CATEGORIES, type Category } from "schema";
import { getDB } from "../utils/idb";

class CategoryStore {
  list = $state<Category[]>(DEFAULT_CATEGORIES);
  isLoaded = $state(false);

  async init() {
    if (this.isLoaded) return;
    
    try {
      const db = await getDB();
      const stored = await db.get("settings", "categories");
      if (stored && Array.isArray(stored)) {
        this.list = stored;
      }
    } catch (e) {
      console.error("Failed to load categories", e);
    } finally {
      this.isLoaded = true;
    }
  }

  async save() {
    try {
      const db = await getDB();
      await db.put("settings", $state.snapshot(this.list), "categories");
    } catch (e) {
      console.error("Failed to save categories", e);
    }
  }

  addCategory(category: Category) {
    this.list.push(category);
    this.save();
  }

  updateCategory(id: string, updates: Partial<Category>) {
    const index = this.list.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.list[index] = { ...this.list[index], ...updates };
      this.save();
    }
  }

  removeCategory(id: string) {
    this.list = this.list.filter((c) => c.id !== id);
    this.save();
  }

  resetToDefaults() {
    this.list = [...DEFAULT_CATEGORIES];
    this.save();
  }

  getCategory(id: string): Category | undefined {
    return this.list.find((c) => c.id === id);
  }

  getColor(id: string): string {
    return this.getCategory(id)?.color || "#15803d"; // Fallback to Scifi Green
  }
}

export const categories = new CategoryStore();
