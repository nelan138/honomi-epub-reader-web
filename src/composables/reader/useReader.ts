import {
   navigateTo,
   navigateToNotFoundPage,
   unwrapAsync,
} from '@src/utilities';
import { getBookFromDB } from '@src/services/dexie/bookRepo';
import { NotFoundError, UnexpectedRuntimeError } from '@src/types';
import type { Section } from '@src/services/epub/epubParser.ts';

export function useReader() {
   const openBook = async (bookId: number) => {
      console.log('Running Reader');
      console.log('BookId: ', bookId);
      const [error] = await unwrapAsync(navigateTo(`/read/${bookId}`));
      if (error) await navigateToNotFoundPage();
   };

   const blobUrls: string[] = [];

   const getChapters = async (
      bookId: number,
   ): Promise<Section[]> => {
      const [bookRecord] = await unwrapAsync(getBookFromDB(bookId));
      if (!bookRecord) throw new NotFoundError('Book not found!');

      const images = bookRecord.images;
      const sections = bookRecord.sections;

      const domParser = new DOMParser();

      for (const section of sections) {
         const doc = domParser.parseFromString(
            section.content,
            'application/xhtml+xml',
         );

         const imgTags = doc.getElementsByTagName('img');
         for (const imgTag of imgTags) {
            const src = imgTag.getAttribute('src');
            if (!src) {
               throw new UnexpectedRuntimeError(
                  'Image tag without src attribute!',
               );
            }

            const blob = images.get(src);
            if (!blob) {
               throw new UnexpectedRuntimeError(
                  `Image not found in book record: ${src}`,
               );
            }

            const blobUrl = URL.createObjectURL(blob);
            blobUrls.push(blobUrl);
            imgTag.setAttribute('src', blobUrl);
         }

         section.content = doc.getElementsByTagName('body')[0]!.innerHTML;
      }

      return sections;
   };

   onUnmounted(() => {
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
   });

   return {
      getChapters,
      openBook,
   };
}
