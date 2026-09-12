import { onMounted, ref } from 'vue';
import {
   type BookCard,
   EpubParsingError,
   NotFoundError,
   UnexpectedRuntimeError,
} from '@src/types';
import {
   addBookToDB,
   changeBookShelfInDB,
   deleteBookFromDB,
   getBooksFromDB,
   renameBookInDB,
} from '@src/services/dexie/bookRepo';
import { parseEpub } from '@src/services/epub/epub.ts';
import { unwrapAsync } from '@src/utilities.ts';
import Dexie from 'dexie';

export function useBooks() {
   const books = ref<BookCard[]>([]);

   const syncWithDB = async () => {
      const [bookRecords, error] = await unwrapAsync(getBooksFromDB());
      if (error) {
         alert('Failed to sync with database: ' + error.message);
         books.value = [];
         return;
      }

      books.value = bookRecords.map((bookRecord): BookCard => ({
         id: bookRecord.id,
         shelfId: bookRecord.shelfId,
         readCharacterCount: bookRecord.readCharacterCount,
         totalCharacterCount: bookRecord.totalCharacterCount,
         title: bookRecord.title,
         creator: bookRecord.creator,
         publisher: bookRecord.publisher,
         language: bookRecord.language,
         cover: bookRecord.cover,
      }));
   };

   onMounted(syncWithDB); // runs in the background

   /* All operations follow Optimistic UI Update pattern:
      * 1. Update the UI first
      * 2. Then update the database
      ! 3. If database update fails, rollback with syncWithDB() and alert the user
   */

   const deleteBook = async (id: number) => {
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
   };

   const renameBook = async (id: number, name: string) => {
      const targetBook = books.value.find((book) => book.id === id);
      if (!targetBook) {
         alert('Book does not exist!');
         return;
      }

      targetBook.title = name;

      const [_, error] = await unwrapAsync(renameBookInDB(id, name));
      if (error) {
         if (error instanceof NotFoundError) throw error; // ! only happens if i made a mistake somewhere, otherwise should never happen
         else if (error instanceof Dexie.DexieError) {
            await syncWithDB();
            alert('Failed to rename book: ' + error.message);
         }
         else { throw new UnexpectedRuntimeError(error.message); }
      }
   };

   const changeBookShelf = async (bookId: number, shelfId: number) => {
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
   };

   const importBooks = async (files: FileList) => {
      let failedBookCount = 0;
      const totalBookCount = files.length;

      for (const file of files) {
         const [book, error1] = await unwrapAsync(parseEpub(file));
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
            failedBookCount++;
            continue;
         }

         const { bookId: id, shelfId } = result;

         const addedBook: BookCard = {
            id,
            shelfId,
            title: book.title,
            creator: book.creator,
            cover: book.cover,
            publisher: book.publisher,
            language: book.language,
            totalCharacterCount: book.totalCharacterCount,
            readCharacterCount: 0, // init
         };

         books.value.push(addedBook); // update UI
      }

      if (failedBookCount > 0) {
         await syncWithDB();
         alert(
            `Failed to import ${failedBookCount} out of ${totalBookCount} books. Check console for details.`,
         );
      }
   };

   return {
      books,
      renameBook,
      changeBookShelf,
      deleteBook,
      importBooks,
   };
}
