import Dexie from 'dexie';
import { db, defaultShelf } from './database';

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
   const books = await db.books.toArray();

   return books;
}

export async function getBookFromDB(id: number): Promise<BookRecord | null> {
   const book = (await db.books.get(id)) ?? null;

   return book;
}

export async function deleteBookFromDB(id: number): Promise<void> {
   await db.books.delete(id);
}

export async function renameBookInDB(bookId: number, newTitle: string): Promise<void> {
   await db.books.update(bookId, { 'metadata.title': newTitle }).then((result) => {
      if (!result) throw new NotFoundError('Book does not exist');
   });
}

export async function changeBookShelfInDB(bookId: number, shelfId: number): Promise<void> {
   await db.transaction('readwrite', [db.books, db.shelves], async () => {
      const shelf = await db.shelves.get(shelfId);
      if (shelf === undefined) throw new Dexie.NotFoundError('Shelf does not exist');

      const result = await db.books.update(bookId, { shelfId: shelfId });

      if (!result) throw new Dexie.NotFoundError('Book does not exist');
   });
}

export async function updateCharactersReadInDB(bookId: number, charactersRead: number): Promise<void> {
   await db.books.update(bookId, { charactersRead: charactersRead }).then((result) => {
      if (!result) throw new Dexie.NotFoundError('Book does not exist');
   });
}
