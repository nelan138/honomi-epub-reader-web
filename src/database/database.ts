export const DB_NAME = "Honomi";
export const DB_VERSION = 1;

export enum STORES {
   BOOKS = "books",
   CATEGORIES = "categories",
   PREFERENCES = "userPreferences"
};

export function createSchemas(db: IDBDatabase) {
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

   // * USER PREFERENCES: Only one record exists
   if (!db.objectStoreNames.contains(STORES.PREFERENCES)) {
      db.createObjectStore(STORES.PREFERENCES);
   }
}

let database: IDBDatabase | null = null;
export function openDatabase(): Promise<IDBDatabase> {
   if (database) return Promise.resolve(database);

   return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
         if (!event.target) {
            reject(new Error("Failed to open database"));
            return;
         }

         const target = event.target as IDBOpenDBRequest;
         const db = target.result;

         createSchemas(db);
      };

      request.onsuccess = () => {
         database = request.result;
         resolve(database);
      };

      request.onerror = () => reject(request.error);
   });
}

