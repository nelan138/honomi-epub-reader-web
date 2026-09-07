import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
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

export function useReader(bookId: number) {
   const router = useRouter();

   const loadedChunks = ref<ContentChunk[]>([]);
   const isReady = ref(false);
   const publisherStyles = ref('');

   let assets: Record<ResolvedPath, Uint8Array> = {};
   let spineItems: SpineItem[] = [];
   let contentMap = new Map<Idref, RawXTHMLContent>();

   let currentSpineItemIndex = 0;

   const textDecoder = new TextDecoder();
   const parser = new DOMParser();

   const processChapter = (
      spineItem: SpineItem,
   ): { content: HTMLContentAsString; blobUrls: string[] } => {
      const rawHtml = contentMap.get(spineItem.idref);
      if (!rawHtml) {
         return {
            content: `<p>Error: Content missing for ${spineItem.idref}</p>`,
            blobUrls: [],
         };
      }

      const doc = parser.parseFromString(rawHtml, 'text/html');

      const blobUrls: string[] = [];
      const images = doc.querySelectorAll('img, image');

      for (const img of images) {
         const src = img.getAttribute('src') || img.getAttribute('href')
            || img.getAttribute('xlink:href');
         if (!src) continue;

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

      return {
         content: doc.body ? doc.body.innerHTML : doc.documentElement.innerHTML,
         blobUrls,
      };
   };

   const loadNextContentToChunks = (): boolean => {
      if (currentSpineItemIndex >= spineItems.length) return false;

      const spineItem = spineItems[currentSpineItemIndex++];
      if (!spineItem) return false;

      const { content, blobUrls } = processChapter(spineItem);

      return loadedChunks.value.push({
         idref: spineItem.idref,
         content,
         blobUrls,
      }) > 0;
   };

   onMounted(async () => {
      try {
         const bookRecord = await getBookFromDB(bookId);
         spineItems = bookRecord.spine;
         assets = bookRecord.assets;
         contentMap = bookRecord.spineItemContentMap;

         const styles = [];
         for (const [path, rawBytes] of Object.entries(assets)) {
            if (path.endsWith('.css'))
               styles.push(textDecoder.decode(rawBytes));
         }
         publisherStyles.value = styles.join('\n');

         isReady.value = true;
      }
      catch {
         router.push('/error/book-not-found');
      }
   });

   onUnmounted(() => {
      loadedChunks.value.forEach((chunk) => {
         if (chunk.blobUrls) {
            for (const url of chunk.blobUrls) URL.revokeObjectURL(url);
         }
      });
   });

   return {
      loadedChunks,
      loadNextContentToChunks,
      spineItems,
      isReady,
      publisherStyles,
   };
}
