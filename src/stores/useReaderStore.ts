import { defineStore } from 'pinia';
import type { BookRecord } from '@src/services/dexie/database.ts';
import { domParser, UnexpectedRuntimeError, unwrapAsync } from '@src/utils.ts';
import { getBookFromDB } from '@src/services/dexie/bookRepo.ts';
import type { Section } from '@src/services/epub/epubParser.ts';

export const useReaderStore = defineStore('reader', () => {
   // STATEs

   const book = ref<BookRecord>();

   const isLoading = ref(false);
   const isLoaded = ref(false);

   // GETTERs

   const charCount = computed(() => book.value?.charCount ?? 0);
   const readCharCount = computed(() => book.value?.readCharCount ?? 0);

   const progress = computed(() => {
      if (!book.value) return 0;

      const readCharCount = book.value.readCharCount;
      const charCount = book.value.charCount;

      if (charCount === 0) return 0;

      return (readCharCount * 100 / charCount).toFixed(2);
   });

   const sections = computed((): Section[] => {
      if (!book.value) return [];

      console.log('Running sections computed property...');

      const images = book.value.images;
      const _sections: Section[] = [];

      for (const section of book.value.sections) {
         const doc = domParser.parseFromString(section.content, 'application/xhtml+xml');

         const body = doc.body ?? doc.getElementsByTagName('body')[0];
         if (!body) {
            console.log('No <body> tag found in section content:', section.content);
            throw new UnexpectedRuntimeError('No <body> tag found!');
         }

         for (const imgTag of body.getElementsByTagName('img')) {
            const src = imgTag.getAttribute('src');
            if (!src) throw new UnexpectedRuntimeError('Image with no src attribute!');

            const blob = images[src];
            if (!blob) throw new UnexpectedRuntimeError(`Image blob not found: ${src}`);

            const blobUrl = URL.createObjectURL(blob);
            imgTag.setAttribute('src', blobUrl);
         }

         _sections.push({
            content: body.innerHTML,
            idref: section.idref,
         });
      }

      return _sections;
   });

   const blobUrls = computed(() => {
      if (!book.value) return [];

      const urls: string[] = [];

      for (const section of sections.value) {
         const doc = domParser.parseFromString(section.content, 'application/xhtml+xml');

         for (const imgTag of doc.getElementsByTagName('img')) {
            const src = imgTag.getAttribute('src');
            if (!src) throw new UnexpectedRuntimeError('Image with no src attribute!');

            urls.push(src);
         }
      }

      return urls;
   });

   // ACTIONS
   function reset() {
      book.value = undefined;

      isLoading.value = false;
      isLoaded.value = false;
   }

   async function load(bookId: number) {
      if (isLoading.value || isLoaded.value) return;

      isLoading.value = true;

      const [data, _] = await unwrapAsync(getBookFromDB(bookId));
      if (!data) throw new UnexpectedRuntimeError(`Failed to load book with ID ${bookId}`);

      book.value = data;

      isLoading.value = false;
      isLoaded.value = true;
   }

   function updateReadCharCount(newCount: number) {
      if (!book.value) throw new UnexpectedRuntimeError('No book loaded');

      book.value.readCharCount = newCount;
   }

   return {
      load,
      reset,
      isLoading,
      isLoaded,
      charCount,
      readCharCount,
      progress,
      updateReadCharCount,
      sections,
      blobUrls,
   };
});
