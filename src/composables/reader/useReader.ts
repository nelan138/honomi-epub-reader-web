import { onMounted, onUnmounted, ref } from 'vue';
import { getBookFromDB } from '@src/services/dexie/bookRepo';
import { resolvePath } from '@src/utilities';
import type {
   Idref,
   RawXTHMLContent,
   ResolvedPath,
   SpineItem,
} from '@src/types/book';
import { useRouter } from 'vue-router';

const router = useRouter();

type HTMLContentAsString = string;

type ContentChunk = {
   idref: Idref;
   content: HTMLContentAsString;
   blobUrls?: string[];
};

export function useReader(bookId: number) {
   const loadedChunks = ref<ContentChunk[]>([]);
   const isReady = ref(false);

   // Runtime caches
   let assets: Record<ResolvedPath, Uint8Array> = {};
   let spineItems: SpineItem[] = [];
   let contentMap = new Map<Idref, RawXTHMLContent>();

   let currentSpineItemIndex = 0;

   const processRuntimeImages = (
      spineItem: SpineItem,
   ): { content: HTMLContentAsString; blobUrls: string[] } => {
      const rawHtml = contentMap.get(spineItem.idref);
      if (!rawHtml) {
         return {
            content: `<p>Error: Content missing for ${spineItem.idref}</p>`,
            blobUrls: [],
         };
      }

      const wrapper = document.createElement('div');
      wrapper.innerHTML = rawHtml;

      const blobUrls: string[] = [];
      const images = wrapper.querySelectorAll('img, image');

      for (const img of images) {
         const src = img.getAttribute('src') || img.getAttribute('href')
            || img.getAttribute('xlink:href');
         if (!src) continue;

         // Skip already-resolved sources
         if (src.startsWith('data:') || /^https?:\/\//.test(src)) continue;

         const imgZipPath = resolvePath(spineItem.resolvedHref, src);
         const imgData = assets[imgZipPath];
         if (!imgData) continue;

         const bytes = new Uint8Array(imgData);
         const blobUrl = URL.createObjectURL(
            new Blob(
               [bytes],
               spineItem.mediaType ? { type: spineItem.mediaType } : undefined,
            ),
         );
         blobUrls.push(blobUrl);

         if (img.tagName.toLowerCase() === 'image')
            img.setAttribute('href', blobUrl);
         else img.setAttribute('src', blobUrl);
      }

      return { content: wrapper.innerHTML, blobUrls };
   };

   const loadNextContentToChunks = (): boolean => {
      if (currentSpineItemIndex >= spineItems.length) return false;

      const spineItem = spineItems[currentSpineItemIndex++];
      if (!spineItem) return false;

      // Process images on-the-fly right before pushing to Vue
      const { content, blobUrls } = processRuntimeImages(spineItem);
      return loadedChunks.value.push({
         idref: spineItem.idref,
         content: content,
         blobUrls,
      }) > 0;
   };

   onMounted(async () => {
      try {
         const bookRecord = await getBookFromDB(bookId);
         spineItems = bookRecord.spine;
         assets = bookRecord.assets;
         contentMap = bookRecord.spineItemContentMap;

         isReady.value = true;
      }
      catch {
         router.push('/error/book-not-found');
      }
   });

   onUnmounted(() => {
      loadedChunks.value.forEach((chunk) => {
         const urls = chunk.blobUrls;
         if (urls) {
            for (const url of urls) URL.revokeObjectURL(url);
         }
      });
   });

   return {
      loadedChunks,
      loadNextContentToChunks,
      spineItems,
      isReady,
   };
}
