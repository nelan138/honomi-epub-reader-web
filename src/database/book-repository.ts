import { openDatabase, STORES } from './database.js';
import { getCategoryById } from "./category-repository.js";
import type { Metadata, ManifestItem, NavigationItem, SpineItem } from '../epub/epub-book.js';

export interface BookRecord {
   id?: number;
   categoryId: number;
   progress: number;

   cover?: Blob;
   metadata?: Metadata;

   epubFile: Blob;
   opfPath: string;
   manifest: ManifestItem[];
   navigation: NavigationItem[];
   spine: SpineItem[];
}

export async function addBook(bookRecord: BookRecord): Promise<number> {
   const db = await openDatabase();

   const store = db.transaction(STORES.BOOKS, 'readwrite').objectStore(STORES.BOOKS);

   return new Promise((resolve, reject) => {
      const request = store.add(bookRecord) as IDBRequest<number>;
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
   });
}

export async function getBookById(id: number): Promise<BookRecord> {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.BOOKS, 'readonly').objectStore(STORES.BOOKS);

      const request = store.get(id) as IDBRequest<BookRecord | undefined>;
      request.onsuccess = () => {
         const book = request.result;
         if (book === undefined) {
            reject(new Error(`Book not found (ID: ${id})`));
            return;
         }
         resolve(book);
      }
      request.onerror = () => reject(request.error);
   });
}

export async function getAllBooks(): Promise<BookRecord[]> {
   const db = await openDatabase();

   return new Promise((resolve, reject) => {
      const store = db
         .transaction(STORES.BOOKS, 'readonly')
         .objectStore(STORES.BOOKS) as IDBObjectStore;

      const request = store.getAll() as IDBRequest<BookRecord[]>;

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
   });
}

export async function getBooksByCategory(id: number): Promise<BookRecord[]> {
   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const bookStore = db
         .transaction([STORES.BOOKS, STORES.CATEGORIES], 'readonly')
         .objectStore(STORES.BOOKS);

      const index = bookStore.index('by_category');
      const request = index.getAll(id) as IDBRequest<BookRecord[]>;

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
   });
}

export async function renameBook(id: number, newTitle: string): Promise<void> {
   const db = await openDatabase();

   const book = await getBookById(id); // ? throw an error if book not found

   if (!book.metadata) book.metadata = { title: newTitle };
   else book.metadata.title = newTitle;

   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.BOOKS, 'readwrite').objectStore(STORES.BOOKS);
      const request = store.put(book);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
   });
}

export async function deleteBook(id: number): Promise<void> {
   // Throw an error if the book does not exist
   await getBookById(id);

   const db = await openDatabase();
   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.BOOKS, 'readwrite').objectStore(STORES.BOOKS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
   });
}

export async function changeBookCategory(bookId: number, categoryId: number): Promise<void> {
   const db = await openDatabase();
   const book = await getBookById(bookId); // ? throw an error
   const category = await getCategoryById(categoryId); // ? throw an error

   return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.BOOKS, 'readwrite').objectStore(STORES.BOOKS);
      book.categoryId = category.id as number;
      const request = store.put(book);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
   });
}

