import type { Metadata, ManifestItem, NavigationItem, SpineItem } from "../epub/epub-book";

export const DB_NAME = "Honomi";
export const DB_VERSION = 1;

export const defaultCategoryName = "Your Library";

export enum STORES {
   BOOKS = "books",
   CATEGORIES = "categories",
   PREFERENCES = "userPreferences"
};

export interface BookRecord {
   id?: number;
   categoryId: number;
   progress: number;

   cover?: Blob;
   metadata?: Metadata;

   epubFile: Blob;
   opfPath: string;
   manifest: ManifestItem[];
   navigation: NavigationItem[];
   spine: SpineItem[];
}

export type CategoryState = false | true | 1 | 0;
export type CategoryIdentifier = number | string;
export interface CategoryRecord {
   id?: number;
   name: string;
   expanded?: CategoryState;
   displayOrder?: number;
}

export type Theme = "light" | "dark";
export type TitleSortOrder = "title-asc" | "title-desc";

export interface UserPreferences {
   theme: Theme;
   titleSortOrder: TitleSortOrder;
}

export function createSchemas(db: IDBDatabase, transaction: IDBTransaction) {
   // * BOOKS
   if (!db.objectStoreNames.contains(STORES.BOOKS)) {
      const bookStore = db.createObjectStore(STORES.BOOKS, {
         keyPath: "id",
         autoIncrement: true,
      });

      bookStore.createIndex("by_category", "categoryId", { unique: false });
   }

   // * CATEGORIES
   if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
      const categoryStore = db.createObjectStore(STORES.CATEGORIES, {
         keyPath: "id",
         autoIncrement: true,
      });
      categoryStore.createIndex("by_name", "name", { unique: true });
   }

   // * USER PREFERENCES: Only one record exists, fixed id of "user-preferences"
   if (!db.objectStoreNames.contains(STORES.PREFERENCES)) {
      db.createObjectStore(STORES.PREFERENCES);
   }
}

