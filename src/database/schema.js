export const DB_NAME = "Honomi";
export const DB_VERSION = 1;

// Additional stores such as word banks can be added here as needed.
export const STORES = {
   BOOKS: "books",
   CATEGORIES: "categories",
};

export function createSchema(db, transaction) {
   if (!db.objectStoreNames.contains(STORES.BOOKS)) {
      db.createObjectStore(STORES.BOOKS, {
         keyPath: "id",
         autoIncrement: true,
      });
   }

   let categoryStore;

   if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
      categoryStore = db.createObjectStore(STORES.CATEGORIES, {
         keyPath: "id",
         autoIncrement: true,
      });
   } else {
      categoryStore = transaction.objectStore(STORES.CATEGORIES);
   }

   if (!categoryStore.indexNames.contains("name")) {
      categoryStore.createIndex("name", "name", { unique: true });
   }
}
