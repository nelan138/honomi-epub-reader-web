import { defineStore } from 'pinia';
import { domParser, RuntimeError, tryCatch } from '@src/utils.ts';
import { getBookFromDB, updateCharactersReadInDB } from '@src/services/dexie/bookRepo.ts';
import type { Section } from '@src/services/epub/epubParser.ts';

export const useReaderStore = defineStore('reader', () => {
   // * STATEs

   const sections = shallowRef<Section[]>([]);
   const totalCharacters = ref(0);
   const charactersRead = ref(0);

   const isLoading = ref(false);
   const isLoaded = ref(false);

   // * PRIVATE STATEs

   let bookId: number | null = null;

   // * GETTERs

   const progress = computed((): string => {
      if (
         !isLoaded.value
         || isLoading.value
         || totalCharacters.value === 0 || charactersRead.value === 0
      ) { return '0.00'; }

      return (charactersRead.value * 100 / totalCharacters.value).toFixed(2);
   });

   const blobUrls = computed(() => {
      if (!isLoaded.value || isLoading.value) return [];

      const urls: string[] = [];

      for (const section of sections.value) {
         const doc = domParser.parseFromString(section.content, 'application/xhtml+xml');

         for (const imgTag of doc.getElementsByTagName('img')) {
            const src = imgTag.getAttribute('src');
            if (!src) throw new RuntimeError('Image with no src attribute!');

            urls.push(src);
         }
      }

      return urls;
   });

   // ACTIONS

   const loadSections = (_sections: Section[], _images: Record<string, Blob>) => {
      const newSections: Section[] = [];

      for (const section of _sections) {
         const doc = domParser.parseFromString(section.content, 'application/xhtml+xml');

         const body = doc.body ?? doc.getElementsByTagName('body')[0];
         if (!body) {
            console.log('No <body> tag found in section content:', section.content);
            throw new RuntimeError('No <body> tag found!');
         }

         for (const imageEl of body.getElementsByTagName('img')) {
            const src = imageEl.getAttribute('src');
            if (!src) throw new RuntimeError('Image with no src attribute!');

            const blob = _images[src];
            if (!blob) throw new RuntimeError(`Image blob not found: ${src}`);

            const blobUrl = URL.createObjectURL(blob);
            imageEl.setAttribute('src', blobUrl);
         }

         newSections.push({
            content: body.innerHTML,
            idref: section.idref,
         });
      }

      sections.value = newSections;
   };

   async function load(_bookId: number) {
      bookId = _bookId;

      if (isLoading.value || isLoaded.value) return;

      isLoading.value = true;

      const [book, error] = await tryCatch(getBookFromDB(_bookId));
      if (book === null || error) throw new RuntimeError(`Failed to load book with ID ${_bookId}`);

      // debugBook(data);

      totalCharacters.value = book.totalCharacters;
      charactersRead.value = book.charactersRead;
      loadSections(book.sections, book.images);

      isLoading.value = false;
      isLoaded.value = true;
   }

   function reset() {
      bookId = null;

      isLoading.value = false;
      isLoaded.value = false;

      totalCharacters.value = 0;
      charactersRead.value = 0;

      sections.value = [];
   }

   /** this DOES NOT sync with DB by default */
   function updateCharactersRead(value: number, options?: { syncWithDb: boolean }) {
      if (value < 0 || value > totalCharacters.value) throw new RuntimeError('Invalid charactersRead value: ' + value);

      if (charactersRead.value === value) return;

      charactersRead.value = value;
      if (options?.syncWithDb) {
         if (!bookId) throw new RuntimeError('Book ID is not set. Cannot sync with DB.');

         updateCharactersReadInDB(bookId, value);
      }
   }

   return {
      // STATEs
      isLoading,
      isLoaded,

      sections,
      totalCharacters,
      charactersRead,

      // GETTERs
      progress,
      blobUrls,

      // ACTIONs
      load,
      reset,
      updateCharactersRead,
   };
});
