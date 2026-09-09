import {
   navigateTo,
   navigateToNotFoundPage,
   resolvePath,
   UNICODE_GLYPH_REGEX,
   unwrapAsync,
   unwrapSync,
} from '@src/utilities';
import { getBookFromDB } from '@src/services/dexie/bookRepo.ts';



export type Chapter = {
   /** ! HTML string */
   idref: string;
   content: string;
   /** ! Remember to provoke these after use */
   blobUrls: string[] | undefined;
   /** Accessing character count of each <p> via p-index: Map<p-index, char count> */
   characterCount: Map<number, number>;
};

export function useReader() {
   console.log('Running Reader');
   const openBook = async (bookId: number) => {
      const [error] = await unwrapAsync(navigateTo(`/read/${bookId}`));
      if (error) await navigateToNotFoundPage();
   };

   const getChapters = async (bookId: number): Promise<Chapter[]> => {
      const [bookRecord] = await unwrapAsync(getBookFromDB(bookId));
      if (!bookRecord) throw new Error('Book not found!');

      const assets = bookRecord.assets;
      const spine = bookRecord.spine;
      const domParser = new DOMParser();

      const chapters: Chapter[] = [];
      let globalParagraphIndex: number = 0; // ! p-index

      for (const item of spine) {
         if (!item.linear) continue;

         // * Get raw content
         const rawHtml = bookRecord.spineItemContentMap.get(item.idref);
         if (!rawHtml) continue;

         const [document] = unwrapSync(() =>
            domParser.parseFromString(
               rawHtml,
               item.mediaType as DOMParserSupportedType,
            )
         );
         if (!document) throw new Error('DOM Parser not working');

         // * Progress tracking
         const paragraphs = document.querySelectorAll('p');
         const characterCount = new Map<number, number>(); // p-index -> count

         for (const paragraph of paragraphs) {
            paragraph.setAttribute(
               'data-p-index',
               globalParagraphIndex.toString(),
            );

            const clone = paragraph.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('rt, rp').forEach((element) =>
               element.remove()
            );

            const text = clone.textContent ?? '';
            const count = text.match(UNICODE_GLYPH_REGEX)?.length ?? 0;
            characterCount.set(globalParagraphIndex++, count);
         }

         // ! Process imgs
         const blobUrls: string[] = [];

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
            characterCount,
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
