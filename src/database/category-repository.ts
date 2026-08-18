import { openDatabase, STORES } from "./database.js";
import { getBooksByCategory } from "./book-repository.js";

export const defaultCategoryName = "Your Library";

export type CategoryState = false | true;
export interface CategoryRecord {
   id?: number;
   name: string;
   expanded: CategoryState;
   displayOrder?: number;
}

type DisplayOrders = { min: number, max: number };
async function getDisplayOrders(): Promise<DisplayOrders> {
   const categories = await getAllCategories();

   if (categories.length === 0) {
      return { min: 0, max: 0 };
   }

   const min = categories.reduce((min, c) => Math.min(min, c.displayOrder ?? 0), Infinity);
   const max = categories.reduce((max, c) => Math.max(max, c.displayOrder ?? 0), -Infinity);
   return { min, max };
}

export async function addCategory(record: CategoryRecord): Promise<number> {
   const db = await openDatabase();
   const { min, max } = await getDisplayOrders();

   return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.CATEGORIES, "readwrite");
      const store = transaction.objectStore(STORES.CATEGORIES);
      const getRequest = store.index("by_name").get(record.name) as IDBRequest<CategoryRecord | undefined>;

      let categoryId: number;

      getRequest.onsuccess = () => {
         const existingCategory = getRequest.result;

         if (existingCategory !== undefined) {
            categoryId = existingCategory.id!;
            return;
         }

         record.displayOrder = max + 1;

         const addRequest = store.add(record) as IDBRequest<number>;

         addRequest.onsuccess = () => {
            categoryId = addRequest.result;
         };

         addRequest.onerror = () => reject(addRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);

      transaction.oncomplete = async () => resolve(categoryId);
      transaction.onerror = () => reject(transaction.error);
   });
}

export async function getCategoryById(id: number): Promise<CategoryRecord> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.CATEGORIES, "readonly").objectStore(STORES.CATEGORIES);
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
   const store = db.transaction(STORES.CATEGORIES, "readonly").objectStore(STORES.CATEGORIES);
   const index = store.index("by_name");
   const request = index.get(name) as IDBRequest<CategoryRecord | undefined>;

   return new Promise((resolve, reject) => {
      request.onsuccess = () => {
         if (request.result === undefined) {
            reject(new Error(`Category not found (Name: ${name})`));
            return;
         }
         resolve(request.result);
      }
      request.onerror = () => reject(request.error);
   });
}

export async function getAllCategories(): Promise<CategoryRecord[]> {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.CATEGORIES, "readonly").objectStore(STORES.CATEGORIES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
   });
}

export async function deleteCategory(id: number): Promise<void> {
   const db = await openDatabase();
   const books = await getBooksByCategory(id);

   return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.CATEGORIES, STORES.BOOKS], "readwrite");

      const categoryStore = transaction.objectStore(STORES.CATEGORIES);
      const bookStore = transaction.objectStore(STORES.BOOKS);

      for (const book of books) {
         const deleteRequest = bookStore.delete(book.id!);
         deleteRequest.onerror = () => reject(deleteRequest.error);
      }

      const deleteRequest = categoryStore.delete(id);
      deleteRequest.onerror = () => reject(deleteRequest.error);

      transaction.oncomplete = async () => resolve();
      transaction.onerror = () => reject(transaction.error);
   });
}

export async function renameCategory(id: number, newCategoryName: string): Promise<void> {
   const db = await openDatabase();
   const category = await getCategoryById(id); // ? throw an error if category not found

   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.CATEGORIES, "readwrite").objectStore(STORES.CATEGORIES);
      category.name = newCategoryName;
      const request = store.put(category);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
   });
}

export async function updateCategoryState(id: number, newState: CategoryState): Promise<void> {
   const db = await openDatabase();
   const category = await getCategoryById(id); // ? throw an error if category not found

   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.CATEGORIES, "readwrite").objectStore(STORES.CATEGORIES);
      category.expanded = newState;
      const request = store.put(category);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
   });
}

// * The lower the displayOrder, the higher the category is displayed in the list.
export async function shiftCategoryDisplayOrder(id: number, delta: 1 | -1): Promise<void> {
   const db = await openDatabase();

   const categories = await getAllCategories();
   const category = await getCategoryById(id);
   const { min: minOrder, max: maxOrder } = await getDisplayOrders();

   return new Promise((resolve, reject) => {
      if (!category) {
         reject(new Error(`Category not found (ID: ${id})`));
         return;
      }

      const newOrder = category.displayOrder! + delta;
      const neighbor = categories.find(c => c.displayOrder === newOrder);

      if (newOrder <= minOrder || newOrder > maxOrder!) {
         resolve();
         return;
      }

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
