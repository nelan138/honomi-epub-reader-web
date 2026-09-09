import {
   navigateTo,
   navigateToNotFoundPage,
   resolvePath,
   unwrapAsync,
   unwrapSync,
} from '@src/utilities';
import { getBookFromDB } from '@src/services/dexie/bookRepo.ts';
import { strFromU8 } from 'fflate';

export type Chapter = {
   /** ! HTML string */
   idref: string;
   content: string;
   /** ! Remember to provoke these after use */
   blobUrls: string[] | undefined;
};

export function useReader() {
   const openBook = async (bookId: number) => {
      const [error] = await unwrapAsync(navigateTo(`/read/${bookId}`));
      if (error) await navigateToNotFoundPage();
   };

   const getChapters = async (bookId: number): Promise<Chapter[]> => {
      const [bookRecord, error] = await unwrapAsync(getBookFromDB(bookId));
      if (error || !bookRecord) throw new Error('Book not found!');

      const assets = bookRecord.assets;
      const spine = bookRecord.spine;
      const domParser = new DOMParser();

      const chapters: Chapter[] = [];
      for (const item of spine) {
         if (!item.linear) continue;

         // Get raw content
         const data = assets[item.resolvedHref];
         if (!data) continue;

         const rawHtml = strFromU8(data);
         const [document] = unwrapSync(() =>
            domParser.parseFromString(
               rawHtml,
               item.mediaType as DOMParserSupportedType,
            )
         );
         if (!document) throw new Error('DOM Parser not working');

         const blobUrls: string[] = [];
         // Process imgs
         for (const image of document.getElementsByTagName('img')) {
            const src = image.getAttribute('src');
            if (!src) continue;

            const resolvedSrc = resolvePath(item.resolvedHref, src);

            const imageData = assets[resolvedSrc];
            if (!imageData) continue;

            const blob = new Blob([imageData as BlobPart]);
            const blobUrl = URL.createObjectURL(blob);

            blobUrls.push(blobUrl);
            image.src = blobUrl;
            image.alt = `image of item: ${item.idref}`;
         }

         const chapter: Chapter = {
            idref: item.idref,
            content: document.body.innerHTML,
            blobUrls,
         };
         chapters.push(chapter);
      }

      return chapters;
   };

   return {
      getChapters,
      openBook,
   };
}
