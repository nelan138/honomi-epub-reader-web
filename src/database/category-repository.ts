import openDatabase from "./database.js";
import { getBooksByCategory } from "./book-repository.js";
import { STORES, defaultCategoryName, type CategoryIdentifier, type CategoryRecord, type CategoryState } from "./schema.js";

export async function addCategory(categoryRecord: CategoryRecord): Promise<number> {
   const db = await openDatabase();

   const existingId = await new Promise<number | undefined>((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, "readonly");
      const store = tx.objectStore(STORES.CATEGORIES);

      const req = store.index("by_name").get(categoryRecord.name) as IDBRequest<CategoryRecord>;

      req.onsuccess = () => {
         if (req.result) resolve(req.result.id);
         else resolve(undefined);
      }
      req.onerror = () => reject(req.error);
   });

   if (existingId) return Number(existingId);

   const { maxOrder, minOrder } = await new Promise<{ maxOrder: number; minOrder: number }>((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, "readonly");
      const store = tx.objectStore(STORES.CATEGORIES);
      const req = store.getAll();
      req.onsuccess = () => {
         const all = req.result as CategoryRecord[];
         const maxOrder = all.reduce((max, c) => Math.max(max, c.displayOrder ?? -1), -1);
         const minOrder = all.find(c => c.name === defaultCategoryName)?.displayOrder ?? 0;
         resolve({ maxOrder, minOrder });
      };
      req.onerror = () => reject(req.error);
   });

   categoryRecord.displayOrder = Math.max(maxOrder + 1, minOrder + 1);
   categoryRecord.expanded = true;

   return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, "readwrite");
      const store = tx.objectStore(STORES.CATEGORIES);
      const req = store.add(categoryRecord) as IDBRequest<number>;
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
   });
}

/**
 * Returns all categories stored in the database.
 * @returns {Promise<Array<CategoryRecord>> | Error} All categories in the database.
 */
export async function getAllCategories(): Promise<CategoryRecord[]> {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.CATEGORIES, "readonly");
      const store = transaction.objectStore(STORES.CATEGORIES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
   });
}

export async function deleteCategory(identifier: CategoryIdentifier): Promise<void> {
   const db = await openDatabase();
   let categoryId;

   if (typeof identifier === "string") {
      const category = await new Promise<CategoryRecord>((resolve, reject) => {
         const transaction = db.transaction(STORES.CATEGORIES, "readonly");
         const store = transaction.objectStore(STORES.CATEGORIES);
         const index = store.index("by_name");
         const request = index.get(identifier) as IDBRequest<CategoryRecord>;

         request.onsuccess = () => resolve(request.result);
         request.onerror = () => reject(request.error);
      });

      if (!category) {
         throw new Error(`Category not found (Name: ${identifier})`);
      }

      categoryId = category.id;
   } else {
      categoryId = identifier;
   }

   if (!categoryId) return;

   // Get all books before starting the delete transaction.
   const books = await getBooksByCategory(categoryId);

   return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.CATEGORIES, STORES.BOOKS], "readwrite");

      const categoryStore = transaction.objectStore(STORES.CATEGORIES);
      const bookStore = transaction.objectStore(STORES.BOOKS);

      for (const book of books) {
         if (book.id) bookStore.delete(book.id);
      }

      categoryStore.delete(categoryId);

      transaction.oncomplete = () => {
         resolve();
      };

      transaction.onerror = () => {
         reject(transaction.error);
      };

      transaction.onabort = () => {
         reject(transaction.error);
      };
   });
}

export async function renameCategory(identifier: CategoryIdentifier, newCategoryName: string): Promise<void> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db
         .transaction(STORES.CATEGORIES, "readwrite")
         .objectStore(STORES.CATEGORIES);

      if (typeof identifier === "string") {
         const index = store.index("by_name");
         const getRequest = index.get(identifier);

         getRequest.onsuccess = () => {
            const category = getRequest.result;

            if (!category) {
               reject(new Error(`Category not found (Name: ${identifier})`));
               return;
            }

            category.name = newCategoryName;

            const putRequest = store.put(category);

            putRequest.onsuccess = () => {
               resolve();
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

      // * typeof identifier === "number"
      const getRequest = store.get(identifier);

      getRequest.onsuccess = () => {
         const category = getRequest.result;

         if (!category) {
            reject(new Error(`Category not found (ID: ${identifier})`));
            return;
         }

         category.name = newCategoryName;

         const putRequest = store.put(category);

         putRequest.onsuccess = () => {
            resolve();
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

export async function updateCategoryState(identifier: CategoryIdentifier, newState: CategoryState): Promise<void> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db
         .transaction(STORES.CATEGORIES, "readwrite")
         .objectStore(STORES.CATEGORIES);

      let getRequest;

      if (typeof identifier === "string") {
         const index = store.index("by_name");
         getRequest = index.get(identifier);
      } else {
         // * typeof identifier === "number"
         getRequest = store.get(identifier);
      }

      getRequest.onsuccess = () => {
         const category = getRequest.result;

         if (!category) {
            reject(
               new Error(
                  typeof identifier === "string"
                     ? `Category not found (Name: ${identifier})`
                     : `Category not found (ID: ${identifier})`
               )
            );
            return;
         }

         category.expanded = newState;

         const putRequest = store.put(category);

         putRequest.onsuccess = () => {
            resolve();
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

export async function getCategory(identifier: CategoryIdentifier): Promise<void> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db
         .transaction(STORES.CATEGORIES, "readonly")
         .objectStore(STORES.CATEGORIES);

      let getRequest;

      if (typeof identifier === "string") {
         const index = store.index("by_name");
         getRequest = index.get(identifier);
      } else {
         // * typeof identifier === "number"
         getRequest = store.get(identifier);
      }

      getRequest.onsuccess = () => {
         const category = getRequest.result;

         if (!category) {
            reject(
               new Error(
                  typeof identifier === "string"
                     ? `Category not found (Name: ${identifier})`
                     : `Category not found (ID: ${identifier})`
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

type CategoryData = {
   category: CategoryRecord;
   neighbor: CategoryRecord | undefined;
   yourBooksOrder: number;
   maxOrder: number;
};

export async function shiftCategoryDisplayOrder(identifier: CategoryIdentifier, delta: number): Promise<void> {
   const db = await openDatabase();

   const { category, neighbor, yourBooksOrder, maxOrder } = await new Promise<CategoryData>((resolve, reject) => {
      const store = db.transaction(STORES.CATEGORIES, "readonly").objectStore(STORES.CATEGORIES);
      const req = store.getAll();
      req.onsuccess = () => {
         const all = req.result;
         const category = typeof identifier === "string"
            ? all.find(c => c.name === identifier)
            : all.find(c => c.id === identifier);
         if (!category) { reject(new Error(`Category not found (Name or ID: ${identifier})`)); return; }
         const newOrder = (category.displayOrder ?? 0) + delta;
         const neighbor = all.find(c => c.displayOrder === newOrder);
         const yourBooksOrder = all.find(c => c.name === defaultCategoryName)?.displayOrder ?? 0;
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