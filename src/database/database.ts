import {
   DB_NAME,
   DB_VERSION,
   defaultCategory,
   defaultUserSettings,
   STORES,
   USER_SETTINGS_KEY,
} from './database.defaults.ts';

function createSchemas(db: IDBDatabase): void {
   // * BOOKS
   if (!db.objectStoreNames.contains(STORES.BOOKS)) {
      const bookStore = db.createObjectStore(STORES.BOOKS, {
         keyPath: 'id',
         autoIncrement: true,
      });

      bookStore.createIndex('by_category', 'categoryId', { unique: false });
   }

   // * CATEGORIES
   if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
      const categoryStore = db.createObjectStore(STORES.CATEGORIES, {
         keyPath: 'id',
         autoIncrement: true,
      });
      categoryStore.createIndex('by_name', 'name', { unique: true });
   }

   // * USER PREFERENCES: Only one record exists
   if (!db.objectStoreNames.contains(STORES.USER_SETTINGS)) db.createObjectStore(STORES.USER_SETTINGS);
}

let database: IDBDatabase | null = null;
// * The database connection is cached in the `database`
export function openDatabase(): Promise<IDBDatabase> {
   if (database) return Promise.resolve(database);

   return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION) as IDBOpenDBRequest;
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
         if (!event.target) {
            reject(new Error('Failed to open database'));
            return;
         }

         const transaction = request.transaction;
         if (!transaction) {
            reject(new Error('Failed to open database'));
            return;
         }
         database = request.result;
         createSchemas(database);

         const categoryStore = transaction.objectStore(STORES.CATEGORIES);
         categoryStore.put(defaultCategory);

         const userPreferencesStore = transaction.objectStore(STORES.USER_SETTINGS);
         userPreferencesStore.put(defaultUserSettings, USER_SETTINGS_KEY);
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
   });
}
