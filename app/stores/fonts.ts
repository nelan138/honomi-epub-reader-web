import { defineStore } from 'pinia';

export const useFontsStore = defineStore('fonts', {
   state: () => ({
      fontNames: [
         'Noto Sans JP',
         'Noto Serif JP',
         'Klee One',
      ] as string[],
   }),
   actions: {},
});
