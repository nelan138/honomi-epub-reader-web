import openDatabase from "./database.js";
import { STORES } from "./schema.js";

/**
 * Get the current theme from the database, or set it to "light" if it doesn't exist.
 *
 * @returns idk?
 */

export async function getTheme() {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.THEME, "readonly").objectStore(STORES.THEME);
      const request = store.get("current");

      request.onsuccess = () => {
         if (request.result) resolve(request.result.value);
         else {
            const addRequest = db.transaction(STORES.THEME, "readwrite").objectStore(STORES.THEME).put({
               id: "current",
               value: "light"
            });

            addRequest.onsuccess = () => resolve("light");
            addRequest.onerror = () => reject(addRequest.error);
         }
      };
      request.onerror = () => reject(request.error);
   });
}
/**
 * Set the current theme in the database.
 *
 * @param {"dark" | "light"} theme
 */

export async function setTheme(theme) {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.THEME, "readwrite").objectStore(STORES.THEME);

      const request = store.put({ id: "current", value: theme });

      request.onsuccess = () => {
         resolve(true);
      };

      request.onerror = () => {
         console.error(`Failed to set theme to ${theme}:`, request.error);
         reject(request.error);
      };
   });
}
