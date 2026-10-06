import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';

export type FontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';

export const useSettingsStore = defineStore('settings', {
   state: () => ({
      settings: useStorage('settings', {
         fontSize: 'base' as FontSize,
      }),
   }),

   getters: {
      fontSize(): FontSize {
         return this.settings.fontSize;
      },
   },

   actions: {
      setFontSize(size: FontSize) {
         this.settings.fontSize = size;
      },
   },
});
