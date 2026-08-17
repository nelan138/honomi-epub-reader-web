import { DB_NAME, DB_VERSION, createSchemas } from "./schema.js";

let database: IDBDatabase | null = null;
export default function openDatabase(): Promise<IDBDatabase> {
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

         createSchemas(db, target.transaction as IDBTransaction);
      };

      request.onsuccess = () => {
         database = request.result;
         resolve(database);
      };

      request.onerror = () => reject(request.error);
   });
}
