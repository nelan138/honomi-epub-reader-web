import type { CategoryRecord } from './category-repository.ts';
import type { UserPreferences } from './user-preference-repository.ts';

export const DB_NAME = 'Honomi';
export const DB_VERSION = 2;

export enum STORES {
   BOOKS = 'books',
   CATEGORIES = 'categories',
   PREFERENCES = 'userPreferences',
}
export const PREFERENCES_KEY = 'user-preferences';

export const defaultPreferences: UserPreferences = {
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
   if (!db.objectStoreNames.contains(STORES.PREFERENCES)) {
      db.createObjectStore(STORES.PREFERENCES);
   }

   console.log('Database schemas created or already exist.');
}

let database: IDBDatabase | null = null;
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

         const userPreferencesStore = transaction.objectStore(
            STORES.PREFERENCES,
         );
         userPreferencesStore.put(defaultPreferences, PREFERENCES_KEY);
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
   });
}
