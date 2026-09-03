import { onMounted, ref, toRaw } from 'vue';
import type { BookRecord } from '@src/types/book';
import {
   addBookToDB,
   changeBookCategoryInDB,
   deleteBookFromDB,
   getBooksFromDB,
   renameBookInDB,
} from '@src/services/database/bookRepo.ts';

function useBooks() {
   const books = ref<BookRecord[]>([]);

   onMounted(async () => {
      books.value = await getBooksFromDB();
   });

   const addBook = async (book: Omit<BookRecord, 'id'>) => {
      const bookId = await addBookToDB(book);
      const addedBook = { id: bookId, ...book };
      books.value.push(addedBook);
   };
   const deleteBook = async (id: number) => {
      const targetBook = books.value.find((book) => book.id === id);
      if (!targetBook) throw new Error('Book does not exist!');

      const copy = structuredClone(toRaw(targetBook));

      // Update UI
      books.value = books.value.filter((book) => book.id !== id);

      try {
         await deleteBookFromDB(id);
      }
      catch (error) {
         // Rollback UI update if deletion fails
         books.value.push(copy);
         alert('Failed to change book category: ' + (error as Error).message);
      }
   };

   const renameBook = async (id: number, newTitle: string) => {
      const targetBook = books.value.find((book) => book.id === id);
      if (!targetBook) throw new Error('Book does not exist!');

      const oldTitle = targetBook.metadata.title;
      // Update UI
      targetBook.metadata.title = newTitle;

      try {
         await renameBookInDB(id, newTitle);
      }
      catch (error) {
         // Rollback UI update if renaming fails
         targetBook.metadata.title = oldTitle;
         alert('Failed to change book category: ' + (error as Error).message);
      }
   };

   const changeBookCategory = async (bookId: number, categoryId: number) => {
      const targetBook = books.value.find((book) => book.id === bookId);
      if (!targetBook) throw new Error('Book does not exist!');

      const oldCategoryId = targetBook.categoryId;

      // Update UI
      targetBook.categoryId = categoryId;

      try {
         await changeBookCategoryInDB(bookId, categoryId);
      }
      catch (error) {
         // Rollback UI update if updating fails
         targetBook.categoryId = oldCategoryId;
         alert('Failed to change book category: ' + (error as Error).message);
      }
   };

   return { books, renameBook, changeBookCategory, deleteBook, addBook };
}

export default useBooks;
