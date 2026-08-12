import EpubBook from "../epub/epub-book.js";

export const DB_NAME = "Honomi";
export const DB_VERSION = 1;

// Additional stores such as word banks can be added here as needed.
export const STORES = {
   BOOKS: "books",
   CATEGORIES: "categories",
};

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

export class CategoryRecord {
   /**
    * Represents a category record in the database.
    * @param {String} name 
    */
   constructor(name) {
      this.name = name;
   }

   toObject() {
      return {
         name: this.name,
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

      // ? idk what is this for ?
      categoryStore.createIndex("by_name", "name", { unique: true });
   }
}
