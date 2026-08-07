export const DB_NAME = "Honomi";
export const DB_VERSION = 1;

// TODO: Will be expanded for Categories, Word-banks, ...
export const STORES = {
   BOOKS: "books",
};

export function createSchema(db) {
   if (!db.objectStoreNames.contains(STORES.BOOKS)) {
      db.createObjectStore(STORES.BOOKS, {
         keyPath: "id",
         autoIncrement: true,
      });
   }
}