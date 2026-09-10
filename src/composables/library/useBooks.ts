import { onMounted, ref } from 'vue';
import type { Book, BookCard } from '@src/types/book';
import {
   addBookToDB,
   changeBookShelfInDB,
   deleteBookFromDB,
   getBooksFromDB,
   renameBookInDB,
} from '@src/services/dexie/bookRepo';
import { useShelves } from '@src/composables/library/useShelves.ts';
import { parseEpub } from '@src/services/epub/epub.ts';
import { unwrapAsync } from '@src/utilities.ts';
import {
   EpubParsingError,
   NotFoundError,
   UnexpectedRuntimeError,
} from '@src/types/errors.ts';
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

   const addBook = async (book: Book) => {
      const [result, error] = await unwrapAsync(
         addBookToDB(book),
      );

      if (error) {
         await syncWithDB();
         alert('Failed to add book: ' + error.message);
         return;
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

      books.value.push(addedBook);
   };

   const deleteBook = async (id: number) => {
      const userConfirmed = confirm(
         'Are you sure you want to delete this book?',
      );
      if (!userConfirmed) return;

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

   const renameBook = async (id: number) => {
      const newBookName = prompt('Enter new book name:', 'New Title')?.trim();
      if (!newBookName) return;

      const targetBook = books.value.find((book) => book.id === id);
      if (!targetBook) {
         alert('Book does not exist!');
         return;
      }

      targetBook.title = newBookName;

      const [_, error] = await unwrapAsync(renameBookInDB(id, newBookName));
      if (error) {
         if (error instanceof NotFoundError) throw error; // ! only happens if i made a mistake somewhere, otherwise should never happen
         else if (error instanceof Dexie.DexieError) {
            await syncWithDB();
            alert('Failed to rename book: ' + error.message);
         }
         else { throw new UnexpectedRuntimeError(error.message); }
      }
   };

   const { shelves } = useShelves();
   const changeBookShelf = async (bookId: number) => {
      // todo: implement a proper UI for selecting
      const shelfName = prompt('Enter shelf name:', 'Your Books')?.trim()
         .toLowerCase();
      if (!shelfName) return;

      // todo-------------------------------------

      const shelfId = shelves.value.find((shelf) =>
         shelf.name.toLowerCase() === shelfName
      )?.id;
      if (!shelfId) {
         alert('Shelf does not exist!');
         return;
      }

      const targetBook = books.value.find((book) => book.id === bookId);
      if (!targetBook) {
         alert('Book does not exist!');
         return;
      }

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
      for (const file of files) {
         const [book, error] = await unwrapAsync(parseEpub(file));
         if (error) {
            if (error instanceof EpubParsingError) {
               console.warn('[Epub] Failed to import one file', error.message);
               continue;
            }
            else { throw new UnexpectedRuntimeError(error.message); }
         }
         await addBook(book);
      }
   };

   return {
      books,
      renameBook,
      changeBookShelf,
      deleteBook,
      addBook,
      importBooks,
   };
}
