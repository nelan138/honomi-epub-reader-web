import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';

/** @use as prose-*  */
export type FontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';

/** @use as prose-p:leading-* */
export type FontLeading = 'tight' | 'snug' | 'normal' | 'relaxed' | 'loose';

/** @use as prose-p:tracking-* */
export type FontTracking = 'tighter' | 'tight' | 'normal' | 'wide' | 'wider' | 'widest';

/** @use as [font-kerning:*] */
export type FontKerning = 'auto' | 'none';

export type WritingMode = 'horizontal' | 'vertical';

/** @use as px-[padding-*] */
export type BookPadding = 'none' | 'compact' | 'normal' | 'relaxed' | 'spacious';

export type ProgressDisplay = 'default' | 'percentage' | 'none';

export type FuriganaDisplay = 'show' | 'hover' | 'none';

export const useSettingsStore = defineStore('settings', {
   state: () => ({
      settings: useStorage('settings', {
         fontSize: 'base' as FontSize,
         fontLeading: 'normal' as FontLeading,
         fontTracking: 'normal' as FontTracking,
         fontKerning: 'auto' as FontKerning,

         writingMode: 'horizontal' as WritingMode,
         scrollSpeed: 80, // px
         bookPadding: 'normal' as BookPadding,
         progressDisplay: 'default' as ProgressDisplay,
         furiganaDisplay: 'show' as FuriganaDisplay,
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

      writingMode(): WritingMode {
         return this.settings.writingMode;
      },

      scrollSpeed(): number {
         return this.settings.scrollSpeed;
      },

      bookPadding(): BookPadding {
         return this.settings.bookPadding;
      },

      progressDisplay(): ProgressDisplay {
         return this.settings.progressDisplay;
      },

      furiganaDisplay(): FuriganaDisplay {
         return this.settings.furiganaDisplay;
      }
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

      setWritingMode(mode: WritingMode) {
         this.settings.writingMode = mode;
         console.log('updated writingMode', mode);
      },

      setScrollSpeed(speed: number) {
         this.settings.scrollSpeed = speed;
      },

      setBookPadding(margin: BookPadding) {
         this.settings.bookPadding = margin;
      },

      setProgressDisplay(display: ProgressDisplay) {
         this.settings.progressDisplay = display;
      },

      setFuriganaDisplay(display: FuriganaDisplay) {
         this.settings.furiganaDisplay = display;
      }
   },
});
