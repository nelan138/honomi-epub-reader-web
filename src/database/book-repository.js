import openDatabase from "./database.js";
import { STORES } from "./schema.js";

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
         resolve(request.result);
      };
      request.onerror = () => reject(request.error);
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
/**
 * @param {number} id
 * @param {string} newTitle
 * @returns {Promise<boolean>} Whether the rename succeeded.
 */

export async function renameBook(id, newTitle) {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.BOOKS, "readwrite").objectStore(STORES.BOOKS);
      const request = store.get(id);
      request.onsuccess = () => {
         const book = request.result;

         if (!book) {
            reject(new Error(`Book not found (ID: ${id})`));
            return;
         }

         book.title = newTitle;
         const putRequest = store.put(book);

         putRequest.onsuccess = () => {
            resolve(true);
         };

         putRequest.onerror = () => {
            reject(putRequest.error);
         };
      };
   });
}
/**
 *
 * @param {Number} id
 * @returns {Boolean} success or not
 */

export async function deleteBook(id) {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.BOOKS, "readwrite").objectStore(STORES.BOOKS);
      const request = store.get(id);

      request.onsuccess = () => {
         const deleteRequest = store.delete(id);
         deleteRequest.onsuccess = () => {
            resolve();
         };

         deleteRequest.onerror = () => { reject(deleteRequest.error); };
      };

      request.onerror = () => { reject(request.error); };

   });
}
/**
 * Changes the category of a book.
 *
 * @param {Number} bookId
 * @param {String | Number} categoryNameOrId
 * @returns {Promise<Boolean>} Whether the category was changed successfully
 */

export async function changeBookCategory(bookId, categoryNameOrId) {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const transaction = db.transaction(
         [STORES.BOOKS, STORES.CATEGORIES],
         "readwrite"
      );

      const bookStore = transaction.objectStore(STORES.BOOKS);
      const categoryStore = transaction.objectStore(STORES.CATEGORIES);

      const bookRequest = bookStore.get(bookId);

      bookRequest.onsuccess = () => {
         const book = bookRequest.result;

         if (!book) {
            reject(new Error(`Book not found (ID: ${bookId})`));
            return;
         }

         let categoryRequest;

         if (typeof categoryNameOrId === "string") {
            const index = categoryStore.index("by_name");
            categoryRequest = index.get(categoryNameOrId);
         } else {
            categoryRequest = categoryStore.get(categoryNameOrId);
         }

         categoryRequest.onsuccess = () => {
            const category = categoryRequest.result;

            if (!category) {
               reject(
                  new Error(
                     typeof categoryNameOrId === "string"
                        ? `Category not found (Name: ${categoryNameOrId})`
                        : `Category not found (ID: ${categoryNameOrId})`
                  )
               );
               return;
            }

            book.categoryId = category.id;

            const putRequest = bookStore.put(book);

            putRequest.onsuccess = () => {
               resolve(true);
            };

            putRequest.onerror = () => {
               reject(putRequest.error);
            };
         };

         categoryRequest.onerror = () => {
            reject(categoryRequest.error);
         };
      };

      bookRequest.onerror = () => {
         reject(bookRequest.error);
      };
   });
}
