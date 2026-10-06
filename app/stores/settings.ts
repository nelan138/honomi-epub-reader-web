import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';

/** @use as prose-*  */
export type FontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';

/** @use as prose-p:leading-* */
export type FontLeading = 'tight' | 'snug' | 'normal' | 'relaxed' | 'loose';
export type FontTracking = 'tighter' | 'tight' | 'normal' | 'wide' | 'wider' | 'widest';
export type FontKerning = 'auto' | 'none';

export const useSettingsStore = defineStore('settings', {
   state: () => ({
      settings: useStorage('settings', {
         fontSize: 'base' as FontSize,
         fontLeading: 'normal' as FontLeading,
         fontTracking: 'normal' as FontTracking,
         fontKerning: 'auto' as FontKerning,
      }),
   }),

   getters: {
      fontSize(): FontSize {
         return this.settings.fontSize;
      },

      fontLeading(): FontLeading {
         return this.settings.fontLeading;
      },

      fontTracking(): FontTracking {
         return this.settings.fontTracking;
      },

      fontKerning(): FontKerning {
         return this.settings.fontKerning;
      },
   },

   actions: {
      setFontSize(size: FontSize) {
         this.settings.fontSize = size;
      },

      setFontLeading(leading: FontLeading) {
         this.settings.fontLeading = leading;
      },

      setFontTracking(tracking: FontTracking) {
         this.settings.fontTracking = tracking;
      },

      setFontKerning(kerning: FontKerning) {
         this.settings.fontKerning = kerning;
      },
   },
});
