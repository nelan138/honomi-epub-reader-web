import type { Idref } from '@src/types/book';
import { getBookFromDB } from '@src/services/dexie/bookRepo.ts';
import { useRouter } from 'vue-router';
import { strFromU8 } from 'fflate';
import { resolvePath } from '@src/utilities.ts';
import { onUnmounted } from 'vue';

type HTMLAsString = string;

export type Chapter = {
   idref: Idref; // use for :key
   content: HTMLAsString;
};

export async function useReader(bookId: number) {
   const router = useRouter();
   const blobUrls: string[] = [];

   onUnmounted(() => {
      blobUrls.forEach((url) => {
         URL.revokeObjectURL(url);
      });
   });

   try {
      const bookRecord = await getBookFromDB(bookId);
      const spine = bookRecord.spine;
      const assets = bookRecord.assets;

      const chapters: Chapter[] = [];
      const parser = new DOMParser();

      for (const item of spine) {
         const data = assets[item.resolvedHref];
         if (!data) continue;

         const rawHtml = strFromU8(data);
         const mediaType = item.mediaType as DOMParserSupportedType;

         const idref = item.idref;
         const doc = parser.parseFromString(rawHtml, mediaType);

         const images = doc.getElementsByTagName('img');
         for (const image of images) {
            const rawSrc = image.getAttribute('src');
            if (!rawSrc) continue;

            const imageSource = resolvePath(item.resolvedHref, rawSrc);
            image.alt = `image of item: ${item.idref}`;

            const imageData = assets[imageSource];
            if (!imageData) continue;

            const blob = new Blob([imageData as BlobPart]);

            const blobUrl = URL.createObjectURL(blob);
            blobUrls.push(blobUrl);
            image.src = blobUrl;
         }

         const content = doc.body?.innerHTML ?? '';

         const chapter: Chapter = {
            idref,
            content,
         };
         chapters.push(chapter);
      }

      return { getChapters: () => chapters };
   }
   catch {
      router.push('/error/book-not-found');
      return { getChapters: () => [] };
   }
}
