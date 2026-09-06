import { db } from '@src/services/dexie/database';
import type { BookRecord } from '@src/types/book';
import { defaultShelf } from '@src/services/dexie/database';
import type { EpubBook } from '@src/types/book';

export async function addBookToDB(
   book: EpubBook,
): Promise<{ bookId: number; shelfId: number }> {
   const store = db.books;

   const record: Omit<BookRecord, 'id'> = {
      ...book,
      progress: 0,
      shelfId: defaultShelf.id,
   };

   const bookId = await store.add(record);
   const shelfId = defaultShelf.id;
   return { bookId, shelfId };
}

export async function getBooksFromDB(): Promise<BookRecord[]> {
   const store = db.books;
   const books = await store.toArray() as BookRecord[];
   return books;
}

export async function getBookFromDB(bookId: number): Promise<BookRecord> {
   const store = db.books;
   const book = await store.get(bookId);
   if (book === undefined) throw new Error('Book does not exist!');

   return book;
}

export async function deleteBookFromDB(id: number): Promise<void> {
   await db.transaction('readwrite', db.books, async () => {
      const store = db.books;
      const existingBook = await store.get(id) as BookRecord | undefined;
      if (existingBook) await store.delete(id);
      else throw new Error('Book does not exist!');
   });
}

export async function renameBookInDB(
   bookId: number,
   newTitle: string,
): Promise<void> {
   const store = db.books;

   const bookRecord = await store.get(bookId) as BookRecord | undefined;
   if (!bookRecord) throw new Error('Book does not exist!');

   bookRecord.title = newTitle;
   await store.put(bookRecord);
}

export async function changeBookShelfInDB(
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
