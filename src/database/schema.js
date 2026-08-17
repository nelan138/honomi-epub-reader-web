import EpubBook from "../epub/epub-book.js";

export const DB_NAME = "Honomi";
export const DB_VERSION = 3;

export const STORES = {
   BOOKS: "books",
   CATEGORIES: "categories",
   PREFERENCES: "userPreferences",
};

/**
 * @property {number | null} categoryId
 * @property {string | null} title
 * @property {string | null} creator
 * @property {string | null} language
 * @property {string | null} publisher
 * @property {string | null} identifier
 * @property {Blob | null} cover
 * @property {number} progress
 * @property {Blob | null} epubFile
 * @property {string | null} opfPath
 * @property {Object | null} manifest
 * @property {Object | null} navigation
 * @property {Array | null} spine
 */
export class BookRecord {
   /**
    * Represents a book record in the database.
    * @param {EpubBook} epubBook 
    */
   constructor(epubBook) {
      this.categoryId = epubBook.getCategoryId() ?? null;

      const metadata = epubBook.getMetadata();
      this.title = metadata.title ?? null;
      this.creator = metadata.creator ?? null;
      this.language = metadata.language ?? null;
      this.publisher = metadata.publisher ?? null;
      this.identifier = metadata.identifier ?? null;

      this.cover = epubBook.getCover() ?? null;
      this.progress = epubBook.getProgress() ?? 0;

      this.epubFile = epubBook.getEpubFile() ?? null;
      this.opfPath = epubBook.getOpfPath() ?? null;
      this.manifest = epubBook.getManifest() ?? null;
      this.navigation = epubBook.getNavigation() ?? null;
      this.spine = epubBook.getSpine() ?? null;
   };

   toObject() {
      return {
         categoryId: this.categoryId,
         title: this.title,
         creator: this.creator,
         language: this.language,
         publisher: this.publisher,
         identifier: this.identifier,
         cover: this.cover,
         progress: this.progress,
         epubFile: this.epubFile,
         opfPath: this.opfPath,
         manifest: this.manifest,
         navigation: this.navigation,
         spine: this.spine,
      }
   }
}

/**
 * @property {string} name
 * @property {boolean} expanded
 * @property {number | null} displayOrder
 */
export class CategoryRecord {
   /**
    * Represents a category record in the database.
    * @param {String} name 
    */
   constructor(name) {
      this.name = name;
      this.expanded = true;
      this.displayOrder = null; // Will be set when saving to the database
   }

   toObject() {
      return {
         name: this.name,
         expanded: this.expanded,
         displayOrder: this.displayOrder,
      }
   }
}

/**
 * @property {"light" | "dark" | null} theme
 * @property {"title-asc" | "title-desc" | null
 */
export class UserPreferencesRecord {
   /**
    * 
    * @param {"light" | "dark" | null} theme 
    * @param {"title-asc" | "title-desc" | null} titleSortOrder 
    */
   constructor(theme = "light", titleSortOrder = "title-asc") {
      this.theme = theme;
      this.titleSortOrder = titleSortOrder;
   }

   toObject() {
      return {
         theme: this.theme,
         titleSortOrder: this.titleSortOrder,
      }
   }
}

export function createSchemas(db, transaction) {
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

