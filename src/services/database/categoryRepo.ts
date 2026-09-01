import { openDatabase } from './database';
import { STORES } from '@src/services/database/database';
import { defaultCategory } from '@src/constants/database';
import type { CategoryRecord, CategoryState } from '@src/types/category';

/**
 * Adds a new category to the database.
 * Returns ID if a category with the same name already exists.
 */
export async function addCategoryToDB(name: string): Promise<void> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.CATEGORIES, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const store = transaction.objectStore(STORES.CATEGORIES);
      const request = store.getAll() as IDBRequest<CategoryRecord[]>;
      request.onsuccess = () => {
         const categories = request.result;
         const existingCategory = categories.find((category) => category.name === name);
         if (existingCategory) {
            resolve();
            return;
         }

         const lastDisplayOrder = categories.reduce((max, category) => Math.max(max, category.displayOrder), 0);
         const newCategory: Omit<CategoryRecord, 'id'> = {
            name: name,
            displayOrder: lastDisplayOrder + 1,
            expanded: true,
         };

         const addRequest = store.add(newCategory);
         addRequest.onsuccess = () => resolve();
      };
   });
}

export async function getCategoryFromDB(id: number): Promise<CategoryRecord>;
export async function getCategoryFromDB(name: string): Promise<CategoryRecord>;
export async function getCategoryFromDB(
   idOrName: number | string,
): Promise<CategoryRecord> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.CATEGORIES, 'readonly').objectStore(
         STORES.CATEGORIES,
      );

      const request = (
         typeof idOrName === 'number' ? store : store.index('by_name')
      ).get(idOrName) as IDBRequest<CategoryRecord | undefined>;

      request.onsuccess = () => {
         if (request.result === undefined) {
            const label = typeof idOrName === 'number' ? 'ID' : 'Name';
            reject(new Error(`Category not found (${label}: ${idOrName})`));
            return;
         }
         resolve(request.result);
      };
      request.onerror = () => reject(request.error);
   });
}

export async function getCategoriesFromDB(): Promise<CategoryRecord[]> {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.CATEGORIES, 'readonly').objectStore(
         STORES.CATEGORIES,
      );
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
   });
}

export async function deleteCategoryFromDB(id: number): Promise<void> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.CATEGORIES, STORES.BOOKS], 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const categoryStore = transaction.objectStore(STORES.CATEGORIES);
      const getCategoryRequest = categoryStore.get(id) as IDBRequest<CategoryRecord | undefined>;
      getCategoryRequest.onsuccess = () => {
         const category = getCategoryRequest.result;
         if (!category) {
            reject(new Error(`Category not found (ID: ${id})`));
            transaction.abort();
            return;
         }
         if (category.id === defaultCategory.id) {
            reject(new Error('Cannot delete the default category'));
            transaction.abort();
            return;
         }
         const bookStore = transaction.objectStore(STORES.BOOKS);
         const getBooksRequest = bookStore.index('by_category').getAllKeys(id) as IDBRequest<number[]>;
         getBooksRequest.onsuccess = () => {
            for (const bookId of getBooksRequest.result) bookStore.delete(bookId);
            categoryStore.delete(id);
         };
      };
   });
}

export async function renameCategoryInDB(id: number, newCategoryName: string): Promise<void> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.CATEGORIES, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const store = transaction.objectStore(STORES.CATEGORIES);
      const getRequestById = store.get(id) as IDBRequest<CategoryRecord | undefined>;

      getRequestById.onsuccess = () => {
         const category = getRequestById.result;
         if (!category) {
            reject(new Error(`Category not found (ID: ${id})`));
            transaction.abort();
            return;
         }

         const getRequestByName = store.index('by_name').get(newCategoryName) as IDBRequest<CategoryRecord | undefined>;
         getRequestByName.onsuccess = () => {
            if (getRequestByName.result === undefined) {
               category.name = newCategoryName;
               store.put(category);
            }
         };
      };
   });
}

export async function changeCategoryStateInDB(id: number, newState: CategoryState): Promise<void> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.CATEGORIES, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const store = transaction.objectStore(STORES.CATEGORIES);
      const getRequest = store.get(id) as IDBRequest<
         CategoryRecord | undefined
      >;
      getRequest.onsuccess = () => {
         const category = getRequest.result;
         if (!category) {
            reject(new Error(`Category not found (ID: ${id})`));
            transaction.abort();
            return;
         }
         category.expanded = newState;
         store.put(category);
      };
   });
}

// * The lower the displayOrder, the higher the category is displayed in the list.
export async function shiftCategoryDisplayOrder(id: number, delta: 1 | -1): Promise<void> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.CATEGORIES, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const store = transaction.objectStore(STORES.CATEGORIES);
      const request = store.getAll() as IDBRequest<CategoryRecord[]>;
      request.onsuccess = () => {
         // * Sort by displayOrders
         const categories = request.result.sort(
            (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
         );

         // * Normalize the displayOrders, starting from 0
         categories.forEach((category, index) => {
            category.displayOrder = index;
         });

         const categoryIndex = categories.findIndex((c) => c.id === id);
         if (categoryIndex === -1 || categoryIndex === 0) return; // ? Does not exist or is the default category (cannot be moved)

         // * Treat indices as displayOrder.
         const newIndex = categoryIndex + delta;
         if (newIndex < 1 || newIndex >= categories.length) return; // Cannot swap with default category (0) or out of bounds

         const categoryToShift = categories[categoryIndex]!;
         const neighborCategory = categories[newIndex]!;

         categoryToShift.displayOrder = newIndex;
         neighborCategory.displayOrder = categoryIndex;

         for (const category of categories) store.put(category);
      };
   });
}
