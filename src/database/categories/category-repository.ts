import { openDatabase } from '../database.ts';
import { STORES } from '../database.defaults.ts';
import type { CategoryDraft, CategoryRecord, CategoryState, DisplayOrders } from './category.types..ts';

// * Lower means higher in the list. The default category is always at the top (displayOrder = 0).
async function getDisplayOrders(): Promise<DisplayOrders> {
   const categories = await getAllCategories();

   return categories.length === 0 ? { min: 0, max: 0 } : {
      min: categories.reduce(
         (min, c) => Math.min(min, c.displayOrder ?? 0),
         Infinity,
      ),
      max: categories.reduce(
         (max, c) => Math.max(max, c.displayOrder ?? 0),
         -Infinity,
      ),
   };
}

/**
 * Adds a new category to the database.
 * Returns ID if a category with the same name already exists.
 */
export async function addCategory(draft: CategoryDraft): Promise<number> {
   const db = await openDatabase();
   const { max } = await getDisplayOrders();

   return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.CATEGORIES, 'readwrite');
      transaction.oncomplete = () => resolve(categoryId!);
      transaction.onerror = () => reject(transaction.error);

      const store = transaction.objectStore(STORES.CATEGORIES);
      const getRequest = store.index('by_name').get(draft.name) as IDBRequest<
         CategoryRecord | undefined
      >;

      let categoryId: number | null = null;
      getRequest.onsuccess = () => {
         const category = getRequest.result;
         if (category === undefined) { // not exist
            const displayOrder = max + 1;
            const addRequest = store.add({ ...draft, displayOrder }) as IDBRequest<number>;
            addRequest.onsuccess = () => categoryId = addRequest.result;
         }
         else { categoryId = category.id!; }
      };
   });
}

export async function getCategoryById(id: number): Promise<CategoryRecord> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.CATEGORIES, 'readonly').objectStore(
         STORES.CATEGORIES,
      );
      const request = store.get(id) as IDBRequest<CategoryRecord | undefined>;
      request.onsuccess = () => {
         const category = request.result;
         if (category === undefined) {
            reject(new Error(`Category not found (ID: ${id})`));
            return;
         }
         resolve(category);
      };
      request.onerror = () => reject(request.error);
   });
}

export async function getCategoryByName(name: string): Promise<CategoryRecord> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.CATEGORIES, 'readonly').objectStore(
         STORES.CATEGORIES,
      );
      const index = store.index('by_name');
      const request = index.get(name) as IDBRequest<CategoryRecord | undefined>;
      request.onsuccess = () => {
         if (request.result === undefined) {
            reject(new Error(`Category not found (Name: ${name})`));
            return;
         }
         resolve(request.result);
      };
      request.onerror = () => reject(request.error);
   });
}

export async function getAllCategories(): Promise<CategoryRecord[]> {
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

export async function deleteCategory(id: number): Promise<void> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const transaction = db.transaction(
         [STORES.CATEGORIES, STORES.BOOKS],
         'readwrite',
      );
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const categoryStore = transaction.objectStore(STORES.CATEGORIES);
      const getCategoryRequest = categoryStore.get(id) as IDBRequest<
         CategoryRecord | undefined
      >;
      getCategoryRequest.onsuccess = () => {
         const category = getCategoryRequest.result;
         if (!category) {
            reject(new Error(`Category not found (ID: ${id})`));
            transaction.abort();
            return;
         }
         const bookStore = transaction.objectStore(STORES.BOOKS);
         const getBooksRequest = bookStore.index('by_category').getAllKeys(
            id,
         ) as IDBRequest<number[]>;
         getBooksRequest.onsuccess = () => {
            for (const bookId of getBooksRequest.result) bookStore.delete(bookId);

            categoryStore.delete(id);
         };
      };
   });
}

export async function renameCategory(id: number, newCategoryName: string): Promise<void> {
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

         category.name = newCategoryName;
         store.put(category);
      };
   });
}

export async function updateCategoryState(id: number, newState: CategoryState): Promise<void> {
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
