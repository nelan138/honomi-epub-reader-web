import { type BookRecord, db, defaultShelf } from '@src/services/dexie/database';

import { NotFoundError } from '@src/utils';
import type { Book } from '@src/services/epub/epubParser.ts';

/* *** */

export async function addBookToDB(book: Book): Promise<{ bookId: number; shelfId: number }> {
   const store = db.books;

   const bookId = await store.add({
      ...book,
      charactersRead: 0,
      shelfId: defaultShelf.id,
   });

   const shelfId = defaultShelf.id;
   return { bookId, shelfId };
}

export async function getBooksFromDB(): Promise<BookRecord[]> {
   const store = db.books;
   const books = await store.toArray();

   return books;
}

export async function getBookFromDB(bookId: number): Promise<BookRecord> {
   const book = await db.books.get(bookId);
   if (!book) throw new NotFoundError('Book is not found');
   return book;
}

export async function deleteBookFromDB(bookId: number): Promise<void> {
   const store = db.books;
   const deletedCount = await store.where('id').equals(bookId).delete();

   if (deletedCount === 0) throw new NotFoundError(`Book with ID ${bookId} not found`);
}

export async function renameBookInDB(bookId: number, newTitle: string): Promise<void> {
   const store = db.books;
   const updatedCount = await store.update(bookId, {
      'metadata.title': newTitle,
   });

   if (updatedCount === 0) throw new NotFoundError(`Book with ID ${bookId} not found`);
}

export async function changeBookShelfInDB(bookId: number, shelfId: number): Promise<void> {
   const bookStore = db.books;
   const shelfStore = db.shelves;

   await db.transaction('readwrite', shelfStore, bookStore, async () => {
      const bookRecord = await bookStore.get(bookId);
      if (!bookRecord) throw new NotFoundError('Book does not exist');

      const shelf = await shelfStore.get(shelfId);
      if (!shelf) throw new NotFoundError('Shelf does not exist');

      bookRecord.shelfId = shelfId;
      await bookStore.put(bookRecord);
   });
}

export async function updateCharactersReadInDB(bookId: number, charactersRead: number): Promise<void> {
   const store = db.books;
   const updatedCount = await store.update(bookId, {
      charactersRead: charactersRead,
   });

   if (updatedCount === 0) throw new NotFoundError('Book does not exist!');
}
