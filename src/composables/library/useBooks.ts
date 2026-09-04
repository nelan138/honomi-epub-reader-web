import { onMounted, ref } from 'vue';
import type { BookRecord, UIBookCard } from '@src/types/book';
import {
   addBookToDB,
   changeBookShelfInDB,
   deleteBookFromDB,
   getBooksFromDB,
   renameBookInDB,
} from '@src/services/dexie/bookRepo';
import { useRouter } from 'vue-router';

function useBooks() {
   const router = useRouter();

   const books = ref<UIBookCard[]>([]);

   const syncWithDB = async () => {
      const bookRecords = await getBooksFromDB();

      books.value = bookRecords.map((bookRecord): UIBookCard => ({
         id: bookRecord.id,
         shelfId: bookRecord.shelfId,
         progress: bookRecord.progress,
         metadata: bookRecord.metadata,
         cover: bookRecord.cover,
      }));
   };

   onMounted(async () => await syncWithDB());

   /* All operations follow Optimistic UI Update pattern:
      * 1. Update the UI first
      * 2. Then update the database
      ! 3. If database update fails, rollback with syncWithDB() and alert the user
   */

   const addBook = async (book: Omit<BookRecord, 'id' | 'shelfId'>) => {
      try {
         const { bookId: id, shelfId } = await addBookToDB(book);
         const { progress, metadata, cover } = book;

         const addedBook: UIBookCard = {
            id,
            shelfId,
            progress,
            metadata,
            cover,
         };
         books.value.push(addedBook);
      }
      catch (error) {
         await syncWithDB();
         alert('Failed to add book: ' + (error as Error).message);
      }
   };
   const deleteBook = async (id: number) => {
      books.value = books.value.filter((book) => book.id !== id);
      try {
         await deleteBookFromDB(id);
      }
      catch (error) {
         // Rollback UI update if deletion fails
         await syncWithDB();
         alert('Failed to delete book: ' + (error as Error).message);
      }
   };

   const renameBook = async (id: number, newTitle: string) => {
      const targetBook = books.value.find((book) => book.id === id);
      if (!targetBook) return alert('Book does not exist!');

      targetBook.metadata.title = newTitle;

      try {
         await renameBookInDB(id, newTitle);
      }
      catch (error) {
         await syncWithDB();
         alert('Failed to rename book: ' + (error as Error).message);
      }
   };

   const changeBookShelf = async (bookId: number, shelfId: number) => {
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

   return { books, renameBook, changeBookShelf, deleteBook, addBook, openBook };
}

export default useBooks;
