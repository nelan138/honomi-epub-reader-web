import { EpubParsingError, NotFoundError, unwrapAsync } from '@src/utils';

import {
   addBookToDB,
   changeBookShelfInDB,
   deleteBookFromDB,
   getBooksFromDB,
   renameBookInDB,
} from '@src/services/dexie/bookRepo';
import { EpubParser } from '@src/services/epub/epubParser';
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
      const [bookRecords, error] = await unwrapAsync(getBooksFromDB());
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

      const [_, error] = await unwrapAsync(deleteBookFromDB(id));

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
      const [_, error] = await unwrapAsync(renameBookInDB(id, name));

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
      const [_, error] = await unwrapAsync(changeBookShelfInDB(bookId, shelfId));

      if (error) {
         await syncWithDB();
         throw error;
      }
   }

   /** Returns number books successfully imported */
   async function importBooks(files: FileList): Promise<number> {
      let count = 0;

      for (const file of files) {
         const [book, error] = await unwrapAsync(EpubParser.parse(file));

         if (error) {
            if (error instanceof EpubParsingError) {
               console.warn('[Epub] Failed to import one file', error.message);

               continue;
            }
            else { throw error; }
         }

         const [result, error2] = await unwrapAsync(addBookToDB(book));

         if (error2) {
            console.warn('[Epub] Failed to import one file', error2.message);

            continue;
         }

         const { bookId: id, shelfId } = result;

         // update UI
         count += 1;

         books.value.push({
            id,
            shelfId,
            charactersRead: 0,
            metadata: book.metadata,
            cover: book.cover,
            totalCharacters: book.totalCharacters,
         });
      }

      if (count !== files.length) await syncWithDB();

      return count;
   }

   return {
      books,
      isLoading,
      isLoaded,
      load,
      reset,
      renameBook,
      changeBookShelf,
      deleteBook,
      importBooks,
   };
});
