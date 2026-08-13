import { BookRecord, CategoryRecord, DB_NAME, DB_VERSION, createSchemas } from "./schema.js";

let database = null;
/**
 * Opens the database, creating it if it does not exist.
 * 
 * @returns {Promise<IDBDatabase>}
 */
export default function openDatabase() {
   if (database) return Promise.resolve(database);

   return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
         const db = event.target.result;
         createSchemas(db, event.target.transaction);
      };

      request.onsuccess = () => {
         database = request.result;
         resolve(database);
      };

      request.onerror = () => reject(request.error);
   });
}
