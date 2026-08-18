import openDatabase from "./database.js";
import { getBooksByCategory } from "./book-repository.js";
import { STORES, defaultCategoryName, type CategoryRecord, type CategoryState } from "./schema.js";

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

export async function getCategoryByName(name: string): Promise<CategoryRecord> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, "readonly");
      const store = tx.objectStore(STORES.CATEGORIES);
      const index = store.index("by_name");
      const request = index.get(name) as IDBRequest<CategoryRecord>;

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
   });
}

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

/**
 * Delete all books in the category and then delete the category itself.
 * 
 * @param identifier - The category's name or ID.
 * @returns A promise that resolves when the category and its books are deleted.
 */
export async function deleteCategory(id: number): Promise<void> {
   const db = await openDatabase();

   const books = await getBooksByCategory(id);

   return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.CATEGORIES, STORES.BOOKS], "readwrite");

      const categoryStore = transaction.objectStore(STORES.CATEGORIES);
      const bookStore = transaction.objectStore(STORES.BOOKS);

      for (const book of books) {
         if (book.id) bookStore.delete(book.id);
      }

      categoryStore.delete(id);

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

export async function renameCategory(id: number, newCategoryName: string): Promise<void> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db
         .transaction(STORES.CATEGORIES, "readwrite")
         .objectStore(STORES.CATEGORIES);

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
         const category = getRequest.result;

         if (!category) {
            reject(new Error(`Category not found (ID: ${id})`));
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

export async function updateCategoryState(id: number, newState: CategoryState): Promise<void> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db
         .transaction(STORES.CATEGORIES, "readwrite")
         .objectStore(STORES.CATEGORIES);

      let getRequest;
      getRequest = store.get(id);

      getRequest.onsuccess = () => {
         const category = getRequest.result;

         if (!category) {
            reject(new Error(`Category not found (ID: ${id})`));
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

export async function getCategory(id: number): Promise<CategoryRecord> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db
         .transaction(STORES.CATEGORIES, "readonly")
         .objectStore(STORES.CATEGORIES);

      let getRequest;
      getRequest = store.get(id);

      getRequest.onsuccess = () => {
         const category = getRequest.result;

         if (!category) {
            reject(new Error(`Category not found (ID: ${id})`));
            return;
         }

         resolve(category);
      };

      getRequest.onerror = () => {
         reject(getRequest.error);
      };
   });
}

// * The lower the displayOrder, the higher the category is displayed in the list.
export async function shiftCategoryDisplayOrder(id: number, delta: 1 | -1): Promise<void> {
   const db = await openDatabase();

   const categories = await getAllCategories();
   const category = await getCategory(id);

   return new Promise((resolve, reject) => {
      if (!category) {
         reject(new Error(`Category not found (ID: ${id})`));
         return;
      }

      const newOrder = category.displayOrder! + delta;
      const neighbor = categories.find(c => c.displayOrder === newOrder);

      const maxOrder = Math.max(...categories.map(c => c.displayOrder ?? 0));
      const minOrder = categories.find(c => c.name === defaultCategoryName)?.displayOrder ?? 0;

      if (newOrder <= minOrder || newOrder > maxOrder) return;

      // If there's no neighbor category to swap with, just resolve without making changes.
      if (!neighbor) {
         resolve();
         return;
      }

      neighbor.displayOrder = category.displayOrder;
      category.displayOrder = newOrder;

      const transaction = db.transaction(STORES.CATEGORIES, "readwrite");
      const store = transaction.objectStore(STORES.CATEGORIES);
      store.put(neighbor);
      store.put(category);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
   });
}