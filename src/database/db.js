import {
   DB_NAME,
   DB_VERSION,
   STORES,
   createSchema,
} from "./schema.js";

let database;

/**
 * Opens the HONOMI IndexedDB database.
 *
 * This should be called once when the application starts.
 * The resulting database connection is stored internally and reused
 * by the other database functions.
 *
 * @returns {Promise<IDBDatabase>}
 * Resolves with the opened IndexedDB database.
 */
export function openDatabase() {
   return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
         createSchema(request.result);
      };

      request.onsuccess = () => {
         database = request.result;
         resolve(database);
      };

      request.onerror = () => {
         reject(request.error);
      };
   });
}

/**
 * Returns the active IndexedDB connection.
 *
 * @returns {IDBDatabase}
 * @throws {Error} If openDatabase() has not been called yet.
 */
function getDatabase() {
   if (!database) {
      throw new Error(
         "Database has not been opened. Call openDatabase() first."
      );
   }

   return database;
}

/**
 * Stores one book in IndexedDB.
 *
 * Example book shape:
 * {
 *   title: "コンビニ人間",
 *   author: "村田沙耶香",
 *   file: File,
 *   cover: Blob
 * }
 *
 * @param {Object} book
 * The book record to store.
 *
 * @param {string} book.title
 * Book title.
 *
 * @param {string} book.author
 * Book author.
 *
 * @param {File|Blob} book.file
 * Original EPUB file.
 *
 * @param {Blob|null} [book.cover]
 * Extracted cover image, if available.
 *
 * @returns {Promise<IDBValidKey>}
 * Resolves with the generated primary key.
 */
export function addBook(book) {
   return new Promise((resolve, reject) => {
      const db = getDatabase();

      const transaction = db.transaction(STORES.BOOKS, "readwrite");
      const store = transaction.objectStore(STORES.BOOKS);

      const request = store.add(book);

      request.onsuccess = () => {
         resolve(request.result);
      };

      request.onerror = () => {
         reject(request.error);
      };
   });
}

/**
 * Retrieves all books stored in IndexedDB.
 *
 * File and Blob values are returned as File/Blob objects.
 *
 * @returns {Promise<Array<Object>>}
 * Resolves with all stored book records.
 */
export function getBooks() {
   return new Promise((resolve, reject) => {
      const db = getDatabase();

      const transaction = db.transaction(STORES.BOOKS, "readonly");
      const store = transaction.objectStore(STORES.BOOKS);

      const request = store.getAll();

      request.onsuccess = () => {
         resolve(request.result);
      };

      request.onerror = () => {
         reject(request.error);
      };
   });
}

/**
 * Deletes one book from IndexedDB.
 *
 * @param {IDBValidKey} id
 * Primary key of the book to delete.
 * With the current auto-increment schema, this will normally be a number.
 *
 * @returns {Promise<void>}
 * Resolves when the delete request succeeds.
 */
export function deleteBook(id) {
   return new Promise((resolve, reject) => {
      const db = getDatabase();

      const transaction = db.transaction(STORES.BOOKS, "readwrite");
      const store = transaction.objectStore(STORES.BOOKS);

      const request = store.delete(id);

      request.onsuccess = () => {
         resolve();
      };

      request.onerror = () => {
         reject(request.error);
      };
   });
}