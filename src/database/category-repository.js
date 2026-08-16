import openDatabase from "./database.js";
import { getBooksByCategory } from "./book-repository.js";
import { STORES, CategoryRecord } from "./schema.js";

/**
 * Returns the ID of the category with the given name, creating it if it does not exist.
 *
 * @param {Object} categoryRecord
 * @returns {Promise<number> | Error } The ID of the category.
 */
export async function addCategory(categoryRecord) {
   const db = await openDatabase();

   const existingId = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, "readonly");
      const store = tx.objectStore(STORES.CATEGORIES);
      const req = store.index("by_name").get(categoryRecord.name);
      req.onsuccess = () => resolve(req.result?.id ?? null);
      req.onerror = () => reject(req.error);
   });

   if (existingId != null) return existingId;

   const { maxOrder, minOrder } = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, "readonly");
      const store = tx.objectStore(STORES.CATEGORIES);
      const req = store.getAll();
      req.onsuccess = () => {
         const all = req.result;
         const maxOrder = all.reduce((max, c) => Math.max(max, c.displayOrder ?? -1), -1);
         const minOrder = all.find(c => c.name === "Your Books")?.displayOrder ?? 0;
         resolve({ maxOrder, minOrder });
      };
      req.onerror = () => reject(req.error);
   });

   categoryRecord.displayOrder = Math.max(maxOrder + 1, minOrder + 1);

   return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, "readwrite");
      const store = tx.objectStore(STORES.CATEGORIES);
      const req = store.add(categoryRecord.toObject());
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
   });
}

/**
 * Returns all categories stored in the database.
 * @returns {Promise<Array<CategoryRecord>> | Error} All categories in the database.
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
 * Delete category from database, including all books belonging to it.
 *
 * Category can be either a string name or a number ID.
 *
 * @param {Number | String} nameOrId
 * @returns {Promise<Boolean> | Error} true if deleted successfully
 */
export async function deleteCategory(nameOrId) {
   const db = await openDatabase();

   let categoryId;

   // Find category ID if a name was provided.
   if (typeof nameOrId === "string") {
      const category = await new Promise((resolve, reject) => {
         const transaction = db.transaction(STORES.CATEGORIES, "readonly");
         const store = transaction.objectStore(STORES.CATEGORIES);
         const index = store.index("by_name");
         const request = index.get(nameOrId);

         request.onsuccess = () => resolve(request.result);
         request.onerror = () => reject(request.error);
      });

      if (!category) {
         throw new Error(`Category not found (Name: ${nameOrId})`);
      }

      categoryId = category.id;
   } else {
      categoryId = nameOrId;
   }

   // Get all books before starting the delete transaction.
   const books = await getBooksByCategory(categoryId);

   return new Promise((resolve, reject) => {
      const transaction = db.transaction(
         [STORES.CATEGORIES, STORES.BOOKS],
         "readwrite"
      );

      const categoryStore = transaction.objectStore(STORES.CATEGORIES);
      const bookStore = transaction.objectStore(STORES.BOOKS);

      for (const book of books) {
         bookStore.delete(book.id);
      }

      categoryStore.delete(categoryId);

      transaction.oncomplete = () => {
         resolve(true);
      };

      transaction.onerror = () => {
         reject(transaction.error);
      };

      transaction.onabort = () => {
         reject(transaction.error);
      };
   });
}

/**
 *
 * @param {Number | String} nameOrId
 * @param {String} newCategoryName
 * @returns {Promise<Boolean> | Error} Whether the rename succeeded.
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
 * @returns {Promise<Boolean> | Error} Whether the category state was updated successfully.
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

/**
 * 
 * @param {String | Number} nameOrId 
 * @returns {Promise<CategoryRecord> | Error} The category record if found.
 */
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

export async function shiftCategoryDisplayOrder(nameOrId, delta) {
   const db = await openDatabase();

   const { category, neighbor, yourBooksOrder, maxOrder } = await new Promise((resolve, reject) => {
      const store = db.transaction(STORES.CATEGORIES, "readonly").objectStore(STORES.CATEGORIES);
      const req = store.getAll();
      req.onsuccess = () => {
         const all = req.result;
         const category = typeof nameOrId === "string"
            ? all.find(c => c.name === nameOrId)
            : all.find(c => c.id === nameOrId);
         if (!category) { reject(new Error(`Category not found (Name or ID: ${nameOrId})`)); return; }
         const newOrder = (category.displayOrder ?? 0) + delta;
         const neighbor = all.find(c => c.displayOrder === newOrder);
         const yourBooksOrder = all.find(c => c.name === "Your Books")?.displayOrder ?? 0;
         const maxOrder = Math.max(...all.map(c => c.displayOrder ?? 0));
         resolve({ category, neighbor, yourBooksOrder, maxOrder });
      };
      req.onerror = () => reject(req.error);
   });

   const newOrder = (category.displayOrder ?? 0) + delta;
   if (newOrder <= yourBooksOrder) return;
   if (newOrder > maxOrder) return;

   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.CATEGORIES, "readwrite").objectStore(STORES.CATEGORIES);
      if (neighbor) {
         neighbor.displayOrder = category.displayOrder;
         store.put(neighbor);
      }
      category.displayOrder = newOrder;
      const req = store.put(category);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
   });
}