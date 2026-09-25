import { NotFoundError, RuntimeError, tryCatch } from '@src/utils';

import {
   addBookToDB,
   changeBookShelfInDB,
   deleteBookFromDB,
   getBooksFromDB,
   renameBookInDB,
} from '@src/services/dexie/bookRepo';
import { EpubParser, ParsingError } from '@src/services/epub/epubParser';
import { defineStore } from 'pinia';
import type { BookRecord } from '@src/services/dexie/database.ts';

/* *** */

export type BookCard = Pick<
   BookRecord,
   'id' | 'shelfId' | 'charactersRead' | 'metadata' | 'cover' | 'totalCharacters'
>;

export const useBookStore = defineStore('book', () => {
   // STATEs

   const books = ref<BookCard[]>([]);

   const isLoading = ref(false);
   const isLoaded = ref(false);

   // ACTIONs

   function reset() {
      books.value = [];
      isLoading.value = false;
      isLoaded.value = false;
   }

   const syncWithDB = async () => {
      const [bookRecords, error] = await tryCatch(getBooksFromDB());
      if (error) throw error;

      books.value = bookRecords.map((record) => ({
         id: record.id,
         shelfId: record.shelfId,
         charactersRead: record.charactersRead,
         metadata: record.metadata,
         cover: record.cover,
         totalCharacters: record.totalCharacters,
      }));
   };

   async function load() {
      if (isLoading.value || isLoaded.value) return;
      isLoading.value = true;

      try {
         await syncWithDB();
         isLoaded.value = true;
      }
      finally {
         isLoading.value = false;
      }
   }

   /* All operations follow Optimistic UI Update pattern:
      * 1. Update the UI first
      * 2. Then update the database
      ! 3. If database update fails, rollback with syncWithDB() and alert the user
   */

   async function deleteBook(id: number) {
      books.value = books.value.filter((book) => book.id !== id);

      const [_, error] = await tryCatch(deleteBookFromDB(id));

      if (error) {
         await syncWithDB();
         throw error;
      }
   }

   async function renameBook(id: number, name: string) {
      // UI first
      const target = books.value.find((book) => book.id === id);
      if (!target) throw new NotFoundError('Book not found');

      target.metadata.title = name;

      // Sync
      const [_, error] = await tryCatch(renameBookInDB(id, name));

      if (error) {
         await syncWithDB();
         throw error;
      }
   }

   async function changeBookShelf(bookId: number, shelfId: number) {
      // UI first
      const target = books.value.find((book) => book.id === bookId);
      if (!target) throw new NotFoundError('Book not found');

      target.shelfId = shelfId;

      // Sync later
      const [_, error] = await tryCatch(changeBookShelfInDB(bookId, shelfId));

      if (error) {
         await syncWithDB();
         throw error;
      }
   }

   // throws ParsingError or RuntimeError
   async function addBook(file: File): Promise<void> {
      isLoading.value = true;

      const [book, error] = await tryCatch(EpubParser.parse(file));

      if (error) {
         isLoading.value = false;
         if (error instanceof ParsingError) throw error;
         else throw new RuntimeError('Failed to import' + file.name, { cause: error });
      }

      const [result, error2] = await tryCatch(addBookToDB(book));

      if (error2) {
         isLoading.value = false;
         throw new RuntimeError('Failed to import' + file.name, { cause: error2 });
      }

      books.value.push({
         id: result.bookId,
         shelfId: result.shelfId,
         charactersRead: 0,
         metadata: book.metadata,
         cover: book.cover,
         totalCharacters: book.totalCharacters,
      });

      isLoading.value = false;
   }

   return {
      books,
      isLoading,
      isLoaded,
      load,
      reset,
      addBook,
      renameBook,
      changeBookShelf,
      deleteBook,
   };
});
