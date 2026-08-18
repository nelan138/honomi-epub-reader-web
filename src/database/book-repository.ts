import openDatabase from './database.js';
import { STORES, type BookRecord, type CategoryRecord } from './schema.js';

/**
 * Adds a new book to the database
 * @param bookRecord
 * @returns the added book's id
 */
export async function addBook(bookRecord: BookRecord): Promise<number> {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const store = db
         .transaction(STORES.BOOKS, 'readwrite')
         .objectStore(STORES.BOOKS) as IDBObjectStore;
      const request = store.add(bookRecord) as IDBRequest<number>;

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
   });
}

/**
 * Retrieves all books from the database
 * @returns Array of all books
 */
export async function getAllBooks(): Promise<BookRecord[]> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db
         .transaction(STORES.BOOKS, 'readonly')
         .objectStore(STORES.BOOKS) as IDBObjectStore;

      const request = store.getAll();

      request.onsuccess = () => {
         const result = request.result as BookRecord[] | undefined;
         resolve(result ?? []);
      };

      request.onerror = () => {
         reject(request.error);
      };
   });
}

export async function getBooksByCategory(id: number): Promise<BookRecord[]> {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.BOOKS, STORES.CATEGORIES], 'readonly');

      const bookStore = tx.objectStore(STORES.BOOKS);
      const index = bookStore.index('by_category');
      const request = index.getAll(id) as IDBRequest<BookRecord[]>;

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
   });
}

export async function renameBook(id: number, newTitle: string): Promise<void> {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.BOOKS, 'readwrite').objectStore(STORES.BOOKS);
      const request = store.get(id) as IDBRequest<BookRecord>;
      request.onsuccess = () => {
         const book = request.result;
         if (!book) {
            reject(new Error(`Book not found (ID: ${id})`));
            return;
         }

         if (!book.metadata) book.metadata = { title: newTitle };
         else { book.metadata.title = newTitle }

         const putRequest = store.put(book);

         putRequest.onsuccess = () => resolve();
         putRequest.onerror = () => reject(putRequest.error);
      };
   });
}

export async function deleteBook(id: number): Promise<void> {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.BOOKS, 'readwrite').objectStore(STORES.BOOKS);
      const request = store.get(id) as IDBRequest<BookRecord>;

      request.onsuccess = () => {
         const deleteRequest = store.delete(id);

         deleteRequest.onsuccess = () => resolve();
         deleteRequest.onerror = () => reject(deleteRequest.error);
      };

      request.onerror = () => reject(request.error);
   });
}

export async function changeBookCategory(bookId: number, categoryId: number): Promise<void> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.BOOKS, STORES.CATEGORIES], 'readwrite');

      const bookStore = transaction.objectStore(STORES.BOOKS);
      const categoryStore = transaction.objectStore(STORES.CATEGORIES);

      const bookRequest = bookStore.get(bookId) as IDBRequest<BookRecord>;

      bookRequest.onsuccess = () => {
         const book = bookRequest.result;

         if (!book) {
            reject(new Error(`Book not found (ID: ${bookId})`));
            return;
         }

         let categoryRequest;

         categoryRequest = categoryStore.get(categoryId) as IDBRequest<CategoryRecord>;

         categoryRequest.onsuccess = () => {
            const category = categoryRequest.result;

            if (!category || !category.id) {
               reject(new Error(`Category error (ID: ${categoryId})`));
               return;
            }

            book.categoryId = category.id;
            const putRequest = bookStore.put(book);

            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
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
