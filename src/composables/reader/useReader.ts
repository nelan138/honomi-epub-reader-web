import { domParser, NotFoundError, UnexpectedRuntimeError, unwrapAsync } from '@src/utils';
import { getBookFromDB } from '@src/services/dexie/bookRepo';
import type { BookRecord } from '@src/services/dexie/database.ts';

/* *** */

export function useReader() {
   const router = useRouter();

   const openBook = async (bookId: number) => {
      const [book] = await unwrapAsync(getBookFromDB(bookId));
      if (book) router.push(`reader/${bookId}`);
      else router.push('/');
   };

   const blobUrls: string[] = [];

   const getBook = async (bookId: number): Promise<BookRecord> => {
      const [book] = await unwrapAsync(getBookFromDB(bookId));
      if (!book) throw new NotFoundError('Book not found!');

      const processImgTags = (imgTags: HTMLCollectionOf<HTMLImageElement>) => {
         for (const imgTag of imgTags) {
            const src = imgTag.getAttribute('src');
            if (!src) {
               throw new UnexpectedRuntimeError(
                  'Image tag without src attribute!',
               );
            }

            const blob = book.images[src];
            if (!blob) {
               throw new UnexpectedRuntimeError(
                  `Image not found in book record: ${src}`,
               );
            }

            const blobUrl = URL.createObjectURL(blob);
            blobUrls.push(blobUrl);

            imgTag.setAttribute('src', blobUrl);
         }
      };

      for (const section of book.sections) {
         const doc = domParser.parseFromString(section.content, 'application/xhtml+xml');

         const imgTags = doc.getElementsByTagName('img');
         processImgTags(imgTags);

         const body = doc.body ?? doc.getElementsByTagName('body')[0];
         if (!body) {
            throw new UnexpectedRuntimeError(
               'No <body> tag found in section content!',
            );
         }

         section.content = body.innerHTML;
      }

      return book;
   };

   onUnmounted(() => {
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
   });

   return {
      openBook,
      getBook,
   };
}
