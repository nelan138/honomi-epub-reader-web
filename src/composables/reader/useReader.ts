import {
   getMimeType,
   navigateTo,
   navigateToNotFoundPage,
   resolvePath,
   UNICODE_GLYPH_REGEX,
   unwrapAsync,
   unwrapSync,
} from '@src/utilities';
import { getBookFromDB } from '@src/services/dexie/bookRepo.ts';
import {
   type Chapter,
   NotFoundError,
   UnexpectedRuntimeError,
   XLINK_NS,
} from '@src/types';

export function useReader() {
   const openBook = async (bookId: number) => {
      console.log('Running Reader');
      console.log('BookId: ', bookId);
      const [error] = await unwrapAsync(navigateTo(`/read/${bookId}`));
      if (error) await navigateToNotFoundPage();
   };

   const getChapters = async (bookId: number): Promise<Chapter[]> => {
      const [bookRecord] = await unwrapAsync(getBookFromDB(bookId));
      if (!bookRecord) throw new NotFoundError('Book not found!');

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
         if (!document)
            throw new UnexpectedRuntimeError('DOM Parser not working');

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

         for (const image of document.querySelectorAll('img, image')) {
            const isSvg = image.tagName.toLowerCase() === 'image';
            const src = image.getAttribute('src')
               ?? image.getAttributeNS(XLINK_NS, 'href')
               ?? image.getAttribute('xlink:href')
               ?? image.getAttribute('href');

            if (!src) {
               console.warn(`Image src not found for item: ${item.idref}`);
               continue;
            }

            const resolvedSrc = resolvePath(item.resolvedHref, src);
            const imageData = assets[resolvedSrc];

            if (!imageData) {
               console.warn(`Image data not found for src: ${resolvedSrc}`);
               continue;
            }

            const blob = new Blob([imageData as BlobPart], {
               type: getMimeType(resolvedSrc),
            });
            const blobUrl = URL.createObjectURL(blob);
            blobUrls.push(blobUrl);

            if (isSvg) {
               image.setAttributeNS(XLINK_NS, 'xlink:href', blobUrl);
               image.setAttribute('href', blobUrl);
            }
            else {
               image.setAttribute('src', blobUrl);
               image.setAttribute('alt', `image of item: ${item.idref}`);
            }
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
