import { defineStore } from 'pinia';
import { getFontsFromDB } from '~/services/dexie/fontRepo';

const defaultFontNames = ['Noto Sans JP', 'Noto Serif JP', 'Klee One'] as string[];

export const useFontsStore = defineStore('fonts', {
   state: () => ({
      fontNames: [...defaultFontNames],

      isLoading: false,
      isLoaded: false,
   }),

   actions: {
      async syncWithDB() {
         if (import.meta.server) return;

         const [data, error] = await tryCatch(getFontsFromDB());
         if (error) throw error;

         for (const savedFont of data) {
            const font = new FontFace(savedFont.name, await savedFont.file.arrayBuffer());

            await font.load();
            document.fonts.add(font);
         }

         this.fontNames = [...defaultFontNames, ...data.map((font) => font.name)];
      },

      async load() {
         if (import.meta.server || this.isLoading || this.isLoaded) return;
         this.isLoading = true;

         const [, error] = await tryCatch(this.syncWithDB());
         this.isLoading = false;

         if (error) {
            this.isLoaded = false;
            throw new RuntimeError('Failed to load fonts', { cause: error });
         }

         this.isLoaded = true;
      },
   },
});
