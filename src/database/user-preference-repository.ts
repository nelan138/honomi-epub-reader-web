import { openDatabase } from "./database.js";
import { STORES } from "./database.js";

const PREFERENCES_KEY = "user-preferences";

export async function getUserPreferences(): Promise<UserPreferences> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.PREFERENCES, "readonly").objectStore(STORES.PREFERENCES);

      const request = store.get(PREFERENCES_KEY) as IDBRequest<UserPreferences>;
      request.onsuccess = async () => {
         if (request.result) {
            resolve(request.result);
            return;
         }

         const defaultPreferences: UserPreferences = {
            theme: "light",
            titleSortOrder: "title-asc"
         };

         try {
            await setUserPreferences(defaultPreferences);
            resolve(defaultPreferences);
         } catch (error) {
            reject(error);
         }
      };

      request.onerror = () => reject(request.error);
   });
}

export async function setUserPreferences(record: UserPreferences): Promise<void> {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.PREFERENCES, "readwrite").objectStore(STORES.PREFERENCES);
      const request = store.put(record, PREFERENCES_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
   });
}
export type Theme = "light" | "dark";
export type TitleSortOrder = "title-asc" | "title-desc";

export interface UserPreferences {
   theme: Theme;
   titleSortOrder: TitleSortOrder;
}
