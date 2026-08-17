import openDatabase from "./database.js";
import { STORES, UserPreferencesRecord } from "./schema.js";

const PREFERENCES_KEY = "user-preferences";

/**
 * 
 * @returns {Promise<UserPreferencesRecord>}
 */
export async function getUserPreferences() {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db
         .transaction(STORES.PREFERENCES, "readonly")
         .objectStore(STORES.PREFERENCES);

      const request = store.get(PREFERENCES_KEY);

      request.onsuccess = async () => {
         if (request.result) {
            resolve(new UserPreferencesRecord(request.result.theme, request.result.titleSortOrder));
            return;
         }

         const defaultPreferences = new UserPreferencesRecord("light", "title-asc");

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

/**
 * 
 * @param { {theme: "light" | "dark", titleSortOrder: "title-asc" | "title-desc"} | UserPreferencesRecord} userPreferencesRecord 
 * @returns {Promise<void>}
 */
export async function setUserPreferences(userPreferencesRecord) {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.PREFERENCES, "readwrite").objectStore(STORES.PREFERENCES);
      const record = userPreferencesRecord instanceof UserPreferencesRecord
         ? userPreferencesRecord
         : new UserPreferencesRecord(userPreferencesRecord.theme, userPreferencesRecord.titleSortOrder);
      const request = store.put(record.toObject(), PREFERENCES_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
   });
}
