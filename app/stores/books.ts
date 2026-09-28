import { defineStore } from "pinia";
import { addBookToDB, getBooksFromDB } from "~/services/dexie/bookRepo";
import type { BookRecord } from "~/services/dexie/database";
import { EpubParser, ParsingError } from "~/services/epub/epubParser";
import { RuntimeError } from "~/types/errors";

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
   },

   getters: {},
});
