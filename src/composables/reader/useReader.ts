import type { Idref } from '@src/types/book';
import { getBookFromDB } from '@src/services/dexie/bookRepo.ts';
import { strFromU8 } from 'fflate';
import { navigateToNotFoundPage, resolvePath } from '@src/utilities.ts';
import { onUnmounted, shallowRef } from 'vue';

type HTMLAsString = string;

export type Chapter = {
   idref: Idref; // use for :key
   content: HTMLAsString;
};

export function useReader(bookId: number) {
   const chapters = shallowRef<Chapter[]>([]);
   const isLoading = shallowRef(true);
   const blobUrls: string[] = [];

   let isUnmounted = false;

   onUnmounted(() => {
      isUnmounted = true;
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
   });

   async function loadBook() {
      try {
         const bookRecord = await getBookFromDB(bookId);

         if (isUnmounted) return;

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

            loadedChapters.push({
               idref: item.idref,
               content: doc.body?.innerHTML ?? '',
            });
         }

         chapters.value = loadedChapters;
      }
      catch (error) {
         if (!isUnmounted) navigateToNotFoundPage();
      }
      finally {
         if (!isUnmounted) isLoading.value = false;
      }
   }

   // runs in the background
   loadBook();

   return { chapters, isLoading };
}
