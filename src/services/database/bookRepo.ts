import { openDatabase } from './database';
import { STORES } from '@src/services/database/database';
import type { CategoryRecord } from '@src/types/category';
import type { BookRecord } from '@src/types/book';

export async function addBookToDB(book: Omit<BookRecord, 'id'>): Promise<void> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.BOOKS, 'readwrite').objectStore(
         STORES.BOOKS,
      );
      const request = store.add(book) as IDBRequest<number>;
      request.onsuccess = () => resolve();

      request.onerror = () => reject(request.error);
   });
}

export async function getBookFromDB(id: number): Promise<BookRecord> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.BOOKS, 'readonly').objectStore(
         STORES.BOOKS,
      );
      const request = store.get(id) as IDBRequest<BookRecord | undefined>;

      request.onsuccess = () => {
         const book = request.result;
         if (book === undefined) {
            reject(new Error(`Book not found (ID: ${id})`));
            return;
         }
         resolve(book);
      };
      request.onerror = () => reject(request.error);
   });
}

export async function getBooksFromDB(): Promise<BookRecord[]> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.BOOKS, 'readonly').objectStore(
         STORES.BOOKS,
      ) as IDBObjectStore;
      const request = store.getAll() as IDBRequest<BookRecord[]>;

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
   });
}

export async function getBooksByCategory(id: number): Promise<BookRecord[]> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db.transaction([STORES.BOOKS], 'readonly')
         .objectStore(STORES.BOOKS);

      const index = store.index('by_category');
      const request = index.getAll(id) as IDBRequest<BookRecord[]>;

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
   });
}

export async function renameBookInDB(id: number, newTitle: string): Promise<void> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.BOOKS, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const store = transaction.objectStore(STORES.BOOKS);
      const getRequest = store.get(id) as IDBRequest<BookRecord | undefined>;
      getRequest.onsuccess = () => {
         const book = getRequest.result;
         if (!book) {
            reject(new Error(`Book not found (ID: ${id})`));
            transaction.abort();
            return;
         }

         (book.metadata ??= {}).title = newTitle;
         store.put(book);
      };
   });
}

export async function deleteBookFromDB(id: number): Promise<void> {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.BOOKS, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const store = transaction.objectStore(STORES.BOOKS);
      const getRequest = store.get(id) as IDBRequest<BookRecord | undefined>;
      getRequest.onsuccess = () => {
         const book = getRequest.result;
         if (!book) {
            reject(new Error(`Book not found (ID: ${id})`));
            transaction.abort();
            return;
         }

         store.delete(id);
      };
   });
}

export async function changeBookCategoryInDB(bookId: number, categoryId: number): Promise<void> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const transaction = db.transaction(
         [STORES.BOOKS, STORES.CATEGORIES],
         'readwrite',
      );
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const bookStore = transaction.objectStore(STORES.BOOKS);
      const getBookRequest = bookStore.get(bookId) as IDBRequest<
         BookRecord | undefined
      >;
      getBookRequest.onsuccess = () => {
         const book = getBookRequest.result;
         if (!book) {
            reject(new Error(`Book not found (ID: ${bookId})`));
            transaction.abort();
            return;
         }

         const getCategoryRequest = transaction.objectStore(STORES.CATEGORIES)
            .get(categoryId) as IDBRequest<CategoryRecord | undefined>;
         getCategoryRequest.onsuccess = () => {
            const category = getCategoryRequest.result;
            if (!category) {
               reject(new Error(`Category not found (ID: ${categoryId})`));
               transaction.abort();
               return;
            }

            book.categoryId = categoryId;
            bookStore.put(book);
         };
      };
   });
}
