import openDatabase from "./database.js";
import { STORES } from "./schema.js";

/**
 *
 * @returns {Promise<string> | Error} The current theme.
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
 * @returns {Promise<boolean> | Error} Whether the theme was set successfully.
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
         reject(request.error);
      };
   });
}
