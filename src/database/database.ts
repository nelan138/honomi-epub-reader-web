import type { CategoryRecord } from './category-repository.ts';
import type { UserSettingsRecord } from './user-setting-repository.ts';

export const DB_NAME = 'Honomi';
export const DB_VERSION = 1;

export const STORES = {
   BOOKS: 'books',
   CATEGORIES: 'categories',
   USER_SETTINGS: 'userSettings',
};
export const USER_SETTINGS_KEY = 'userPreferences';

export const defaultUserSettings: UserSettingsRecord = {
   theme: 'light',
   titleSortOrder: 'title-asc',
};

export const defaultCategory: CategoryRecord = {
   id: 1,
   displayOrder: 0,
   name: 'Your Library',
   expanded: true,
};

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

   console.log('Database schemas created or already exist.');
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
