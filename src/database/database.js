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
            console.log(`Changed book's title (ID: ${id}) to ${newTitle}`);
            resolve(true);
         };

         putRequest.onerror = () => {
            reject(putRequest.error);
         };
      }
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
            console.log(`Deleted book (ID: ${id}, Title: ${request.result.title})`);
            resolve();
         }

         deleteRequest.onerror = () => { reject(deleteRequest.error) }
      }

      request.onerror = () => { reject(request.error) }

   })
}
/**
 * Delete category from database, category can be either string or number
 *
 * @param {Number | String} nameOrId
 * @returns {Promise<Boolean>} true if deleted successfully
 */
export async function deleteCategory(nameOrId) {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db
         .transaction(STORES.CATEGORIES, "readwrite")
         .objectStore(STORES.CATEGORIES);

      if (typeof nameOrId === "string") {
         const index = store.index("by_name");
         const getRequest = index.get(nameOrId);

         getRequest.onsuccess = () => {
            const category = getRequest.result;

            if (!category) {
               reject(new Error(`Category not found (Name: ${nameOrId})`));
               return;
            }

            const deleteRequest = store.delete(category.id);

            deleteRequest.onsuccess = () => {
               console.log(`Deleted category (Name: ${nameOrId})`);
               resolve(true);
            };

            deleteRequest.onerror = () => {
               reject(deleteRequest.error);
            };
         };

         getRequest.onerror = () => {
            reject(getRequest.error);
         };

         return;
      }

      const deleteRequest = store.delete(nameOrId);

      deleteRequest.onsuccess = () => {
         console.log(`Deleted category (ID: ${nameOrId})`);
         resolve(true);
      };

      deleteRequest.onerror = () => {
         reject(deleteRequest.error);
      };
   });
}

/**
 * 
 * @param {Number | String} nameOrId 
 * @param {String} newCategoryName 
 */
export async function renameCategory(nameOrId, newCategoryName) {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db
         .transaction(STORES.CATEGORIES, "readwrite")
         .objectStore(STORES.CATEGORIES);

      if (typeof nameOrId === "string") {
         const index = store.index("by_name");
         const getRequest = index.get(nameOrId);

         getRequest.onsuccess = () => {
            const category = getRequest.result;

            if (!category) {
               reject(new Error(`Category not found (Name: ${nameOrId})`));
               return;
            }

            category.name = newCategoryName;

            const putRequest = store.put(category);

            putRequest.onsuccess = () => {
               console.log(
                  `Changed category's name (Name: ${nameOrId}) to ${newCategoryName}`
               );
               resolve(true);
            };

            putRequest.onerror = () => {
               reject(putRequest.error);
            };
         };

         getRequest.onerror = () => {
            reject(getRequest.error);
         };

         return;
      }

      // * typeof nameOrId === "number"
      const getRequest = store.get(nameOrId);

      getRequest.onsuccess = () => {
         const category = getRequest.result;

         if (!category) {
            reject(new Error(`Category not found (ID: ${nameOrId})`));
            return;
         }

         category.name = newCategoryName;

         const putRequest = store.put(category);

         putRequest.onsuccess = () => {
            console.log(
               `Changed category's name (ID: ${nameOrId}) to ${newCategoryName}`
            );
            resolve(true);
         };

         putRequest.onerror = () => {
            reject(putRequest.error);
         };
      };

      getRequest.onerror = () => {
         reject(getRequest.error);
      };
   });
}

/**
 * 
 * @param {String | Number} nameOrId 
 * @param {Boolean} newState - 1: Expanded, 0: Collapsed
 */
export async function updateCategoryState(nameOrId, newState) {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db
         .transaction(STORES.CATEGORIES, "readwrite")
         .objectStore(STORES.CATEGORIES);

      let getRequest;

      if (typeof nameOrId === "string") {
         const index = store.index("by_name");
         getRequest = index.get(nameOrId);
      } else {
         // * typeof nameOrId === "number"
         getRequest = store.get(nameOrId);
      }

      getRequest.onsuccess = () => {
         const category = getRequest.result;

         if (!category) {
            reject(
               new Error(
                  typeof nameOrId === "string"
                     ? `Category not found (Name: ${nameOrId})`
                     : `Category not found (ID: ${nameOrId})`
               )
            );
            return;
         }

         category.expanded = newState;

         const putRequest = store.put(category);

         putRequest.onsuccess = () => {
            resolve(true);
         };

         putRequest.onerror = () => {
            reject(putRequest.error);
         };
      };

      getRequest.onerror = () => {
         reject(getRequest.error);
      };
   });
}

export async function getCategory(nameOrId) {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db
         .transaction(STORES.CATEGORIES, "readonly")
         .objectStore(STORES.CATEGORIES);

      let getRequest;

      if (typeof nameOrId === "string") {
         const index = store.index("by_name");
         getRequest = index.get(nameOrId);
      } else {
         // * typeof nameOrId === "number"
         getRequest = store.get(nameOrId);
      }

      getRequest.onsuccess = () => {
         const category = getRequest.result;

         if (!category) {
            reject(
               new Error(
                  typeof nameOrId === "string"
                     ? `Category not found (Name: ${nameOrId})`
                     : `Category not found (ID: ${nameOrId})`
               )
            );
            return;
         }

         resolve(category);
      };

      getRequest.onerror = () => {
         reject(getRequest.error);
      };
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
               console.log(
                  `Changed book's category (Book ID: ${bookId}) to ${category.name}`
               );

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