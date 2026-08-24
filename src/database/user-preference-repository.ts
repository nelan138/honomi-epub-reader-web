import { defaultPreferences, openDatabase, PREFERENCES_KEY } from './database.ts';
import { STORES } from './database.ts';

export type Theme = 'light' | 'dark';
export type TitleSortOrder = 'title-asc' | 'title-desc';
export interface UserPreferences {
   theme: Theme;
   titleSortOrder: TitleSortOrder;
}

export async function getUserPreferences(): Promise<UserPreferences> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.PREFERENCES, 'readonly').objectStore(
         STORES.PREFERENCES,
      );
      const request = store.get(PREFERENCES_KEY) as IDBRequest<UserPreferences>;
      request.onsuccess = () => {
         if (request.result) {
            resolve(request.result);
            return;
         }
         else { reject(new Error('User preferences not found')); }
      };

      request.onerror = () => reject(request.error);
   });
}

export async function setUserPreferences(record = defaultPreferences): Promise<void> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.PREFERENCES, 'readwrite').objectStore(
         STORES.PREFERENCES,
      );
      const request = store.put(record, PREFERENCES_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
   });
}
