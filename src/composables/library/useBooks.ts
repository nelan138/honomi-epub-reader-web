import { onMounted, ref } from 'vue';
import type { Book, BookCard } from '@src/types/book';
import {
   addBookToDB,
   changeBookShelfInDB,
   deleteBookFromDB,
   getBooksFromDB,
   renameBookInDB,
} from '@src/services/dexie/bookRepo';
import { useRouter } from 'vue-router';
import { useShelves } from '@src/composables/library/useShelves.ts';
import { Epub } from '@src/services/epub/epub.ts';

export function useBooks() {
   const router = useRouter();

   const books = ref<BookCard[]>([]);

   const syncWithDB = async () => {
      const bookRecords = await getBooksFromDB();

      books.value = bookRecords.map((bookRecord): BookCard => ({
         id: bookRecord.id,
         shelfId: bookRecord.shelfId,
         progress: bookRecord.progress,
         title: bookRecord.title,
         creator: bookRecord.creator,
         publisher: bookRecord.publisher,
         language: bookRecord.language,
         cover: bookRecord.cover,
      }));
   };

   onMounted(async () => await syncWithDB());

   /* All operations follow Optimistic UI Update pattern:
      * 1. Update the UI first
      * 2. Then update the database
      ! 3. If database update fails, rollback with syncWithDB() and alert the user
   */

   const addBook = async (book: Book) => {
      try {
         const { bookId: id, shelfId } = await addBookToDB(book);
         const { title, creator, cover, publisher, language } = book;

         const addedBook: BookCard = {
            id,
            shelfId,
            title,
            creator,
            cover,
            publisher,
            language,
            progress: 0,
         };
         books.value.push(addedBook);
      }
      catch (error) {
         await syncWithDB();
         alert('Failed to add book: ' + (error as Error).message);
      }
   };

   const deleteBook = async (id: number) => {
      const userConfirmed = confirm(
         'Are you sure you want to delete this book?',
      );

      if (!userConfirmed) return;

      books.value = books.value.filter((book) => book.id !== id);
      try {
         await deleteBookFromDB(id);
      }
      catch (error) {
         await syncWithDB();
         alert('Failed to delete book: ' + (error as Error).message);
      }
   };

   const renameBook = async (id: number) => {
      const newBookName = prompt('Enter new book name:', 'New Title')?.trim();
      if (!newBookName) return;

      const targetBook = books.value.find((book) => book.id === id);
      if (!targetBook) return alert('Book does not exist!');

      targetBook.title = newBookName;

      try {
         await renameBookInDB(id, newBookName);
      }
      catch (error) {
         await syncWithDB();
         alert('Failed to rename book: ' + (error as Error).message);
      }
   };

   const { shelves } = useShelves();
   const changeBookShelf = async (bookId: number) => {
      const shelfName = prompt('Enter shelf name:', 'Your Books')?.trim().toLowerCase();
      if (!shelfName) return;

      const shelfId = shelves.value.find((shelf) => shelf.name.toLowerCase() === shelfName)
         ?.id;
      if (!shelfId) return alert('Shelf does not exist!');

      const targetBook = books.value.find((book) => book.id === bookId);
      if (!targetBook) return alert('Book does not exist!');

      targetBook.shelfId = shelfId;

      try {
         await changeBookShelfInDB(bookId, shelfId);
      }
      catch (error) {
         await syncWithDB();
         alert('Failed to change book shelf: ' + (error as Error).message);
      }
   };

   const openBook = (bookId: number) => {
      try {
         router.push(`/read/${bookId}`);
      }
      catch (error) {
         alert('Failed to open book: ' + (error as Error).message);
      }
   };

   const importBooks = async (files: FileList) => {
      for (const file of files) {
         if (!file) continue;

         const book = await Epub.parse(file);
         await addBook(book);
         // logBook(book);
      }
   };

   return {
      books,
      renameBook,
      changeBookShelf,
      deleteBook,
      addBook,
      openBook,
      importBooks,
   };
}
