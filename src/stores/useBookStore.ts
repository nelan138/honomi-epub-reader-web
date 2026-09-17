import { EpubParsingError, NotFoundError, UnexpectedRuntimeError, unwrapAsync } from '@src/utils';

import {
   addBookToDB,
   changeBookShelfInDB,
   deleteBookFromDB,
   getBooksFromDB,
   renameBookInDB,
} from '@src/services/dexie/bookRepo';
import Dexie from 'dexie';
import { EpubParser } from '@src/services/epub/epubParser';
import { defineStore } from 'pinia';
import type { BookRecord } from '@src/services/dexie/database.ts';

/* *** */

export type BookCard = Pick<
   BookRecord,
   'id' | 'shelfId' | 'readCharCount' | 'metadata' | 'cover' | 'charCount'
>;

export const useBookStore = defineStore('book', () => {
   const books = ref<BookCard[]>([]);

   const syncWithDB = async () => {
      const [bookRecords, error] = await unwrapAsync(getBooksFromDB());
      if (error) {
         console.error('Failed to sync with database: ' + error.message);
         books.value = [];
         return;
      }

      books.value = bookRecords.map((record) => {
         return {
            id: record.id,
            shelfId: record.shelfId,
            readCharCount: record.readCharCount,
            metadata: record.metadata,
            cover: record.cover,
            charCount: record.charCount,
         };
      });
   };

   let isLoading = false;
   let isLoaded = false;

   async function load() {
      if (isLoading || isLoaded) return;
      isLoading = true;
      await syncWithDB();
      isLoading = false;
      isLoaded = true;
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
         if (error instanceof NotFoundError) throw error; // ! only happens if i made a mistake somewhere, otherwise should never happen
         else if (error instanceof Dexie.DexieError) {
            await syncWithDB();
            alert('Failed to delete book: ' + error.message);
         }
         else { throw new UnexpectedRuntimeError(error.message); }
      }
   }

   async function renameBook(id: number, name: string) {
      const targetBook = books.value.find((book) => book.id === id);
      if (!targetBook) {
         alert('Book does not exist!');
         return;
      }

      targetBook.metadata.title = name;

      const [_, error] = await unwrapAsync(renameBookInDB(id, name));
      if (error) {
         if (error instanceof NotFoundError) throw error; // ! only happens if i made a mistake somewhere, otherwise should never happen
         else if (error instanceof Dexie.DexieError) {
            await syncWithDB();
            alert('Failed to rename book: ' + error.message);
         }
         else { throw new UnexpectedRuntimeError(error.message); }
      }
   }

   async function changeBookShelf(bookId: number, shelfId: number) {
      const targetBook = books.value.find((book) => book.id === bookId);
      if (!targetBook) throw new NotFoundError('Book does not exist!');

      targetBook.shelfId = shelfId;

      const [_, error] = await unwrapAsync(
         changeBookShelfInDB(bookId, shelfId),
      );

      if (error) {
         if (error instanceof NotFoundError) throw error; // ! only happens if i made a mistake somewhere, otherwise should never happen
         else if (error instanceof Dexie.DexieError) {
            await syncWithDB();
            alert('Failed to change book shelf: ' + error.message);
         }
         else { throw new UnexpectedRuntimeError(error.message); }
      }
   }

   async function importBooks(files: FileList) {
      let failedBookCount = 0;
      const totalBookCount = files.length;

      for (const file of files) {
         const [book, error1] = await unwrapAsync(EpubParser.parse(file));
         if (error1) {
            if (error1 instanceof EpubParsingError) {
               console.warn('[Epub] Failed to import one file', error1.message);
               failedBookCount++;
               continue;
            }
            else { throw new UnexpectedRuntimeError(error1.message); }
         }

         const [result, error2] = await unwrapAsync(
            addBookToDB(book),
         );

         if (error2) {
            console.warn('[Epub] Failed to import one file', error2.message);
            failedBookCount++;
            continue;
         }

         const { bookId: id, shelfId } = result;

         const addedBook: BookCard = {
            id,
            shelfId,
            readCharCount: 0,
            metadata: book.metadata,
            cover: book.cover,
            charCount: book.charCount,
         };

         books.value.push(addedBook); // update UI
      }

      if (failedBookCount > 0) {
         await syncWithDB();
         alert(
            `Failed to import ${failedBookCount} out of ${totalBookCount} books. Check console for details.`,
         );
      }
   }

   return {
      books,
      load,
      renameBook,
      changeBookShelf,
      deleteBook,
      importBooks,
   };
});
