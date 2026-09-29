import { defineStore } from "pinia";
import {
   addBookToDB,
   changeBookShelfInDB,
   deleteBookFromDB,
   getBooksFromDB,
   renameBookInDB,
} from "~/services/dexie/bookRepo";
import { EpubParser } from "~/services/epub/epubParser";

export const useBooksStore = defineStore("books", {
   state: () => ({
      books: [] as BookRecord[],

      isLoading: false,
      isLoaded: false,
   }),

   actions: {
      async syncWithDB() {
         const [data, error] = await tryCatch(getBooksFromDB());
         if (error) throw error;

         this.books = data;
      },

      async load() {
         if (this.isLoading || this.isLoaded) return;
         this.isLoading = true;

         try {
            await this.syncWithDB();
            this.isLoaded = true;
         } finally {
            this.isLoading = false;
         }
      },

      async add(file: File) {
         const [book, error] = await tryCatch(EpubParser.parse(file));

         if (error) {
            if (error instanceof ParsingError) throw error;

            throw new RuntimeError("Failed to import" + file.name, {
               cause: error,
            });
         }

         const [data, error2] = await tryCatch(addBookToDB(book));

         if (error2) {
            throw new RuntimeError("Failed to import" + file.name, {
               cause: error2,
            });
         }

         const newBook: BookRecord = {
            id: data.bookId,
            shelfId: data.shelfId,
            charactersRead: 0,
            ...book,
         };

         this.books.push(newBook);
      },

      async rename(id: number, newName: string) {
         // UI first
         const target = this.books.find((book) => book.id === id);
         if (!target) throw new NotFoundError("Book not found");

         target.metadata.title = newName;

         // Sync
         const [_, error] = await tryCatch(renameBookInDB(id, newName));

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
         if (!target) throw new NotFoundError("Book not found");

         target.shelfId = toShelf;

         // Sync later
         const [_, error] = await tryCatch(changeBookShelfInDB(id, toShelf));

         if (error) {
            await this.syncWithDB();
            throw error;
         }
      },
   },

   getters: {},
});
