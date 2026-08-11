import { BookRecord, CategoryRecord, DB_NAME, DB_VERSION, STORES, createSchemas } from "./schema.js";

let database = null;
/**
 * Opens the database, creating it if it does not exist.
 * 
 * @returns {Promise<IDBDatabase>}
 */
export function openDatabase() {
   if (database) return Promise.resolve(database);

   return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
         const db = event.target.result;
         createSchemas(db, event.target.transaction);
         console.log("Upgrade needed, version:", db.version);
      };

      request.onsuccess = () => {
         database = request.result;
         resolve(database);
      };

      request.onerror = () => reject(request.error);
   });
}

/**
 * Adds a book to the database.
 * 
 * @param {BookRecord} bookRecord 
 * @returns {Promise<number>} The ID of the newly added book.
 */
export async function addBook(bookRecord) {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.BOOKS, "readwrite");
      const store = transaction.objectStore(STORES.BOOKS);
      const request = store.add(bookRecord.toObject());

      request.onsuccess = () => {
         console.log("Book added with ID:", request.result);
         resolve(request.result)
      };
      request.onerror = () => reject(request.error);
   });
}

/**
 * Returns the ID of the category with the given name, creating it if it does not exist.
 * 
 * @param {Object} categoryRecord 
 * @returns {Promise<number>} The ID of the category.
 */
export async function addCategory(categoryRecord) {
   const db = await openDatabase();

   // * Check if the category already exists
   const existingId = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, "readonly");
      const store = tx.objectStore(STORES.CATEGORIES);
      const index = store.index("by_name");

      const req = index.get(categoryRecord.name);

      req.onsuccess = () => {
         console.log("Existing category ID:", req.result?.id);
         resolve(req.result?.id ?? null);
      }
      req.onerror = () => reject(req.error);
   });

   if (existingId != null) return existingId;

   return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, "readwrite");
      const store = tx.objectStore(STORES.CATEGORIES);

      const req = store.add(categoryRecord.toObject());

      req.onsuccess = () => {
         console.log("Category added with ID:", req.result);
         resolve(req.result);
      }
      req.onerror = () => reject(req.error);
   });
}

/**
 * Returns all books stored in the database.
 * 
 * @returns {Promise<Array<BookRecord>>}
 */
export async function getAllBooks() {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.BOOKS, "readonly");
      const store = transaction.objectStore(STORES.BOOKS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
   });
}

/**
 * Returns all categories stored in the database.
 * @returns {Promise<Array<CategoryRecord>>}
 */
export async function getAllCategories() {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.CATEGORIES, "readonly");
      const store = transaction.objectStore(STORES.CATEGORIES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
   });
}

/**
 * Returns all books belonging to a category.
 * @param {number} categoryId
 * @returns {Promise<Array>}
 */
export async function getBooksByCategory(categoryId) {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.BOOKS, "readonly");
      const store = transaction.objectStore(STORES.BOOKS);
      const index = store.index("by_category");
      const request = index.getAll(categoryId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
   });
}