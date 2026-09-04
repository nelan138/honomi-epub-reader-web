import { db } from '@src/services/dexie/database';
import type { BookRecord } from '@src/types/book';
import { defaultShelf } from '@src/services/dexie/database';

async function addBookToDB(
   book: Omit<BookRecord, 'id' | 'shelfId'>,
): Promise<{ bookId: number; shelfId: number }> {
   const store = db.books;
   const record = { ...book, shelfId: defaultShelf.id };
   const bookId = await store.add(record);
   const shelfId = defaultShelf.id;
   return { bookId, shelfId };
}

async function getBooksFromDB(): Promise<BookRecord[]> {
   const store = db.books;
   const books = await store.toArray() as BookRecord[];
   return books;
}

async function deleteBookFromDB(id: number): Promise<void> {
   await db.transaction('readwrite', db.books, async () => {
      const store = db.books;
      const existingBook = await store.get(id) as BookRecord | undefined;
      if (existingBook) await store.delete(id);
      else throw new Error('Book does not exist!');
   });
}

async function renameBookInDB(bookId: number, newTitle: string): Promise<void> {
   const store = db.books;

   const bookRecord = await store.get(bookId) as BookRecord | undefined;
   if (!bookRecord) throw new Error('Book does not exist!');

   bookRecord.metadata.title = newTitle;
   await store.put(bookRecord);
}

async function changeBookShelfInDB(
   bookId: number,
   shelfId: number,
): Promise<void> {
   const bookStore = db.books;
   const shelfStore = db.shelves;

   await db.transaction('readwrite', shelfStore, bookStore, async () => {
      const bookRecord = await bookStore.get(bookId) as BookRecord | undefined;
      if (bookRecord === undefined) throw new Error('Book does not exist!');

      const shelfExists = await shelfStore.where(':id').equals(shelfId)
         .firstKey();
      if (!shelfExists) throw new Error('Shelf does not exist');

      bookRecord.shelfId = shelfId;
      await bookStore.put(bookRecord);
   });
}

export {
   addBookToDB,
   changeBookShelfInDB,
   deleteBookFromDB,
   getBooksFromDB,
   renameBookInDB,
};
