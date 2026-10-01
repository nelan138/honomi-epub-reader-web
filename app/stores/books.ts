import { defineStore } from 'pinia';
import {
   addBookToDB,
   changeBookShelfInDB,
   deleteBookFromDB,
   getBooksFromDB,
   renameBookInDB,
} from '~/services/dexie/bookRepo';
import { EpubParser } from '~/services/epub/epubParser';

export const useBooksStore = defineStore('books', {
   state: () => ({
      books: [] as Pick<BookRecord, 'id' | 'shelfId' | 'charactersRead' | 'cover' | 'metadata' | 'totalCharacters'>[],

      isLoading: false,
      isLoaded: false,
   }),

   actions: {
      async syncWithDB() {
         const [data, error] = await tryCatch(getBooksFromDB());
         if (error) throw error;

         this.books = data.map((book) => ({
            id: book.id,
            shelfId: book.shelfId,
            charactersRead: book.charactersRead,
            cover: book.cover,
            metadata: book.metadata,
            totalCharacters: book.totalCharacters,
         }));
      },

      async load() {
         if (this.isLoading || this.isLoaded) return;
         this.isLoading = true;

         const [, error] = await tryCatch(this.syncWithDB());
         if (error) {
            this.isLoading = false;
            this.isLoaded = false;
            throw new RuntimeError('Failed to sync with DB', { cause: error });
         }

         this.isLoading = false;
         this.isLoaded = true;
      },

      async add(file: File) {
         const [book, error] = await tryCatch(EpubParser.parse(file));

         if (error) {
            throw new RuntimeError(`Failed to parse ${file.name}`, { cause: error });
         }

         const [result, error2] = await tryCatch(addBookToDB(book));

         if (error2) {
            throw new RuntimeError(`Failed to add ${file.name}`, {
               cause: error2,
            });
         }

         const { bookId: id, shelfId } = result;
         
         const newBook: BookRecord = {
            id,
            shelfId,
            charactersRead: 0,
            ...book,
         };

         this.books.push(newBook);
      },

      async rename(id: number, newName: string) {
         // UI first
         const target = this.books.find((book) => book.id === id);
         if (!target) throw new NotFoundError('Book not found');

         target.metadata.title = newName;

         // Sync
         const [, error] = await tryCatch(renameBookInDB(id, newName));

         if (error) {
            await this.syncWithDB();
            throw error;
         }
      },

      async delete(id: number) {
         this.books = this.books.filter((book) => book.id !== id);

         const [_, error] = await tryCatch(deleteBookFromDB(id));

         if (error) {
            await this.syncWithDB();
            throw error;
         }
      },

      async changeShelf(id: number, toShelf: number) {
         // UI first
         const target = this.books.find((book) => book.id === id);
         if (!target) throw new NotFoundError('Book not found');

         target.shelfId = toShelf;

         // Sync later
         const [_, error] = await tryCatch(changeBookShelfInDB(id, toShelf));

         if (error) {
            await this.syncWithDB();
            throw error;
         }
      },
   },
});
