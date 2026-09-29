import { defineStore } from "pinia";
import { getBookFromDB } from "~/services/dexie/bookRepo";

export const useReaderStore = defineStore("reader", {
   state: () => ({
      book: null as Pick<
         BookRecord,
         | "charactersRead"
         | "id"
         | "sections"
         | "navigation"
         | "images"
         | "totalCharacters"
      > | null,

      isLoading: false,
      isLoaded: false,
   }),

   getters: {
      progress: (state) => {
         if (state.book === null || state.book.totalCharacters === 0)
            return "0.00";
         else
            return (
               (state.book.charactersRead * 100) /
               state.book.totalCharacters
            ).toFixed(2);
      },

      navigation: (state) => {
         if (state.book === null) return [];
         else return state.book.navigation;
      },

      sections: (state) => {
         if (state.book === null) return [];
         return state.book.sections;
      },
   },

   actions: {
      async load(bookId: number) {
         if (this.isLoading || this.isLoaded) return;

         this.isLoading = true;

         const [result, error] = await tryCatch(getBookFromDB(bookId));

         if (error) {
            this.isLoading = false;

            throw new RuntimeError(`Failed to load book with ID ${bookId}`, {
               cause: error,
            });
         }

         if (result === null) {
            this.isLoading = false;

            throw new NotFoundError(
               `Book with ID ${bookId} not found in the database.`,
            );
         }

         this.book = result;

         this.isLoading = false;
         this.isLoaded = true;
      },

      /**
       * ! call this after load->sections to load all imgs in book and return blob urls
       *
       * it replaces img tag src with blob urls
       */
      loadImages(): string[] {
         if (this.book === null) return [];

         const imgBlobUrls = [] as string[];

         for (const section of this.book.sections) {
            const doc = domParser.parseFromString(
               section.content,
               "application/xhtml+xml",
            );

            for (const imageEl of doc.getElementsByTagName("img")) {
               const src = imageEl.getAttribute("src");
               if (!src) {
                  console.warn("Image tag with no src in:", section.idref);
                  continue;
               }

               const blob = this.book.images[src];
               if (!blob) {
                  console.warn("Image blob not in archive:", src);
                  continue;
               }

               const blobUrl = URL.createObjectURL(blob);
               imageEl.setAttribute("src", blobUrl);
               console.log(blobUrl);

               imgBlobUrls.push(blobUrl);
            }

            section.content = xmlSerializer.serializeToString(doc);
         }

         return imgBlobUrls;
      },
   },
});
