import { db } from './db';
import type { BookRecord } from '@src/types/book';
import { defaultCategory } from './db';

async function addBookToDB(book: Omit<BookRecord, 'id'>): Promise<number> {
   const store = db.books;
   const addedBookId = await store.add({ ...book, categoryId: defaultCategory.id });
   return addedBookId;
}

async function getBooksFromDB(): Promise<BookRecord[]> {
   const store = db.books;
   const books = await store.toArray() as Required<BookRecord>[];
   return books;
}

async function deleteBookFromDB(id: number): Promise<void> {
   await db.transaction('readwrite', db.books, async () => {
      const store = db.books;
      const existingBook = await store.get(id) as Required<BookRecord> | undefined;
      if (existingBook) await store.delete(id);
      else throw new Error('Book does not exist!');
   });
}

async function renameBookInDB(bookId: number, newTitle: string): Promise<void> {
   const store = db.books;

   const bookRecord = await store.get(bookId) as Required<BookRecord> | undefined;
   if (!bookRecord) throw new Error('Book does not exist!');

   bookRecord.metadata.title = newTitle;
   await store.put(bookRecord);
}

async function changeBookCategoryInDB(
   bookId: number,
   categoryId: number,
): Promise<void> {
   const bookStore = db.books;
   const categoryStore = db.categories;

   await db.transaction('readwrite', categoryStore, bookStore, async () => {
      const bookRecord = await bookStore.get(bookId) as Required<BookRecord> | undefined;
      if (bookRecord === undefined) throw new Error('Book does not exist!');

      const categoryExists = await categoryStore.where(':id').equals(categoryId).firstKey();
      if (!categoryExists) throw new Error('Category does not exist');

      bookRecord.categoryId = categoryId;
      await bookStore.put(bookRecord);
   });
}

export { addBookToDB, changeBookCategoryInDB, deleteBookFromDB, getBooksFromDB, renameBookInDB };
