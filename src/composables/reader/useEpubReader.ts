import { nextTick, onMounted, onUnmounted, type Ref, ref } from 'vue';
import { getBookFromDB } from '@src/services/dexie/bookRepo';
import { resolvePath } from '@src/utilities';
import type {
   Idref,
   RawXTHMLContent,
   ResolvedPath,
   SpineItem,
} from '@src/types/book';

type HTMLContentAsString = string;

type ContentChunk = {
   idref: Idref;
   content: HTMLContentAsString;
   blobUrls?: string[];
};

export function useEpubReader(
   bookId: number,
   reachedBottom: Ref<HTMLElement | null>,
   onError: () => void,
) {
   const loadedChunks = ref<ContentChunk[]>([]);

   // Runtime caches
   let assets: Record<ResolvedPath, Uint8Array> = {};
   let spineItems: SpineItem[] = [];
   let contentMap = new Map<Idref, RawXTHMLContent>();

   let observer: IntersectionObserver | null = null;
   let currentSpineItemIndex = 0;
   let contentIsLoading = false;

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

   const loadNextContentToChunks = () => {
      if (currentSpineItemIndex >= spineItems.length) return;

      const spineItem = spineItems[currentSpineItemIndex++];
      if (!spineItem) return;

      // Process images on-the-fly right before pushing to Vue
      const { content, blobUrls } = processRuntimeImages(spineItem);
      loadedChunks.value.push({
         idref: spineItem.idref,
         content: content,
         blobUrls,
      });
   };

   const appendNextChunk = async () => {
      if (contentIsLoading || currentSpineItemIndex >= spineItems.length) {
         if (currentSpineItemIndex >= spineItems.length) observer?.disconnect();
         return;
      }

      contentIsLoading = true;
      loadNextContentToChunks();
      await nextTick();
      contentIsLoading = false;

      requestAnimationFrame(() => {
         if (!reachedBottom.value) return;
         const rect = reachedBottom.value.getBoundingClientRect();
         if (rect.top <= globalThis.innerHeight + 800) appendNextChunk();
      });
   };

   onMounted(async () => {
      try {
         const bookRecord = await getBookFromDB(bookId);
         spineItems = bookRecord.spine;
         assets = bookRecord.assets;
         contentMap = bookRecord.spineItemContentMap;
      }
      catch (e) {
         return onError();
      }

      const BUFFER_ZONE = 800;
      while (currentSpineItemIndex < spineItems.length) {
         loadNextContentToChunks();
         await nextTick();

         if (reachedBottom.value) {
            const rect = reachedBottom.value.getBoundingClientRect();
            if (rect.top > globalThis.innerHeight + BUFFER_ZONE) break;
         }
      }

      observer = new IntersectionObserver(
         ([entry]) => {
            if (entry?.isIntersecting) appendNextChunk();
         },
         { root: null, rootMargin: `${BUFFER_ZONE}px 0px`, threshold: 0 },
      );

      if (reachedBottom.value) observer.observe(reachedBottom.value);
   });

   onUnmounted(() => {
      if (observer) observer.disconnect();
   });

   return { loadedChunks };
}
