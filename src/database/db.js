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
         createSchema(request.result, request.transaction);
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
 *   categoryId: 1,
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
 * @param {IDBValidKey} book.categoryId
 * Primary key of the category this book belongs to.
 *
 * @param {File|Blob} book.file
 * Original EPUB file. After IndexedDB retrieval, this value is a Blob;
 * EpubBook accepts it as the EPUB file payload.
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
 * Returns the category ID for the given name, creating the category
 * first if it does not exist yet.
 *
 * @param {string} name - Category name (must be unique).
 * @returns {Promise<IDBValidKey>} Resolves with the category's primary key.
 */
export function addCategory(name) {
   return new Promise((resolve, reject) => {
      const db = getDatabase();
      const transaction = db.transaction(STORES.CATEGORIES, "readwrite");
      const store = transaction.objectStore(STORES.CATEGORIES);
      const existingRequest = store.index("name").getKey(name);

      existingRequest.onsuccess = () => {
         if (existingRequest.result !== undefined) {
            resolve(existingRequest.result);
            return;
         }

         const request = store.add({ name });

         request.onsuccess = () => {
            resolve(request.result);
         };

         request.onerror = () => {
            reject(request.error);
         };
      };

      existingRequest.onerror = () => {
         reject(existingRequest.error);
      };
   });
}

/**
 * Deletes one category from IndexedDB.
 *
 * @param {IDBValidKey} id - Primary key of the category to delete.
 * @returns {Promise<void>} Resolves when the delete request succeeds.
 */
export function deleteCategory(id) {
   return new Promise((resolve, reject) => {
      const db = getDatabase();
      const transaction = db.transaction(STORES.CATEGORIES, "readwrite");
      const store = transaction.objectStore(STORES.CATEGORIES);
      const request = store.delete(id);

      request.onsuccess = () => {
         resolve();
      };

      request.onerror = () => {
         reject(request.error);
      };
   });
}

/**
 * Retrieves all categories stored in IndexedDB.
 *
 * @returns {Promise<Array<{ id: IDBValidKey, name: string }>>}
 * Resolves with all stored category records.
 */
export function getCategories() {
   return new Promise((resolve, reject) => {
      const db = getDatabase();
      const transaction = db.transaction(STORES.CATEGORIES, "readonly");
      const store = transaction.objectStore(STORES.CATEGORIES);
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
 * Retrieves all books stored in IndexedDB.
 *
 * Each book record contains its database ID, title, category ID,
 * and original EPUB archive as a Blob. EpubBook treats this Blob as the
 * EPUB file payload when parsing it.
 *
 * @returns {Promise<Array<{
 *   id: number,
 *   title: string,
 *   categoryId: IDBValidKey,
 *   file: Blob
 * }>>}
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
