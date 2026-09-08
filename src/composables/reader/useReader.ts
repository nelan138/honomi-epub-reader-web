import type { Idref } from '@src/types/book';
import { getBookFromDB } from '@src/services/dexie/bookRepo.ts';
import { strFromU8 } from 'fflate';
import { navigateToNotFoundPage, resolvePath } from '@src/utilities.ts';
import { onUnmounted, shallowRef, ref } from 'vue';

type HTMLAsString = string;

export type Chapter = {
   idref: Idref; // use for :key
   content: HTMLAsString;
};

export function useReader(bookId: number) {
   const chapters = shallowRef<Chapter[]>([]);
   const blobUrls: string[] = [];

   let isUnmounted = false;

   onUnmounted(() => {
      isUnmounted = true;
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
   });

   const cumulativeCharacterCountMap = new Map<number, number>();

   const cumulativeChars = ref(0);
   async function loadBook() {
      const bookRecord = await getBookFromDB(bookId).catch(
         navigateToNotFoundPage,
      );

      if (!bookRecord) return navigateToNotFoundPage();
      if (isUnmounted) return;

      cumulativeCharacterCountMap.clear();
      let globalIndex = 0;

      const spine = bookRecord.spine;
      const assets = bookRecord.assets;
      const parser = new DOMParser();
      const loadedChapters: Chapter[] = [];

      for (const item of spine) {
         if (isUnmounted) break;

         const data = assets[item.resolvedHref];
         if (!data) continue;

         const rawHtml = strFromU8(data);
         const doc = parser.parseFromString(
            rawHtml,
            item.mediaType as DOMParserSupportedType,
         );

         for (const image of doc.getElementsByTagName('img')) {
            const rawSrc = image.getAttribute('src');
            if (!rawSrc) continue;

            const imageData = assets[resolvePath(item.resolvedHref, rawSrc)];
            if (!imageData) continue;

            const blob = new Blob([imageData as BlobPart]);
            const blobUrl = URL.createObjectURL(blob);

            blobUrls.push(blobUrl);
            image.src = blobUrl;
            image.alt = `image of item: ${item.idref}`;
         }

         const paragraphs = doc.getElementsByTagName('p');
         for (let i = 0; i < paragraphs.length; i++) {
            const p = paragraphs[i];
            if (!p) continue;

            p.setAttribute('data-index', globalIndex.toString());

            const clone = p.cloneNode(true) as HTMLElement;

            const rubyAnnotations = clone.querySelectorAll('rt, rp');
            for (let j = 0; j < rubyAnnotations.length; j++)
               rubyAnnotations[j]?.remove();

            cumulativeChars.value += clone.textContent?.length ?? 0;
            cumulativeCharacterCountMap.set(globalIndex, cumulativeChars.value);

            globalIndex++;
         }
         const content = doc.body?.innerHTML ?? '';

         loadedChapters.push({
            idref: item.idref,
            content,
         });
      }

      chapters.value = loadedChapters;
   }

   const totalCharacterCount = cumulativeChars;
   // runs in the background
   loadBook();
   return {
      chapters,
      cumulativeCharacterCountMap,
      totalCharacterCount,
   };
}
