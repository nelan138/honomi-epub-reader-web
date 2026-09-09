import type { Book } from '@src/types/book.ts';
import { router } from '@src/router.ts';

export function normalizePath(path: string): string {
   const parts: string[] = [];
   for (const part of path.replaceAll('\\', '/').split('/')) {
      if (!part || part === '.') continue;

      if (part === '..') {
         if (parts.length === 0)
            throw new Error(`Path escapes root directory: ${path}`);
         parts.pop();
         continue;
      }
      parts.push(part);
   }
   return parts.join('/');
}

export function resolvePath(basePath: string, relativePath: string): string {
   const baseParts = normalizePath(basePath).split('/');
   baseParts.pop();
   return normalizePath([...baseParts, relativePath].join('/'));
}

export function getElementText(parent: Element, localName: string): string {
   return parent.getElementsByTagNameNS('*', localName)[0]?.textContent?.trim()
      ?? '';
}

export function getXmlDocument(
   path: string,
   fileArchive: Record<string, Uint8Array>,
): Document {
   const normalized = normalizePath(path);
   const data = fileArchive[normalized];

   if (!data) throw new Error(`File entry not found: ${normalized}`);

   const xml = new TextDecoder('utf-8').decode(data);
   const document = new DOMParser().parseFromString(xml, 'application/xml');

   if (document.getElementsByTagName('parsererror').length > 0)
      throw new Error(`Invalid XML in file entry: ${normalized}`);

   return document;
}

export function logBook(book: Book): void {
   console.log(`%c📖 ${book.title}`, 'font-weight: bold; font-size: 14px;');

   console.table({
      Title: book.title,
      Creator: book.creator,
      Publisher: book.publisher,
      Language: book.language,
      'Cover Type': book.cover.type || '(unknown)',
      'Cover Size': `${(book.cover.size / 1024).toFixed(2)} KB`,
      'Spine Items': book.spine.length,
      'Assets': Object.keys(book.assets).length,
      'Spine Content Cached': book.spineItemContentMap.size,
   });

   if (book.spine.length > 0) {
      console.groupCollapsed('Spine');
      console.table(book.spine);
      console.groupEnd();
   }

   if (Object.keys(book.assets).length > 0) {
      console.groupCollapsed('Assets');
      console.table(
         Object.entries(book.assets).map(([path, data]) => ({
            path,
            bytes: data.byteLength,
         })),
      );
      console.groupEnd();
   }
}

export function navigateToHomePage() {
   return router.push('/');
}

export function navigateToNotFoundPage() {
   return router.push('error/not-found');
}

export function navigateTo(path: string) {
   return router.push(path);
}

export async function unwrapAsync<T, E = Error>(
   promise: Promise<T>,
): Promise<[T, null] | [null, E]> {
   try {
      const data = await promise;
      return [data, null];
   }
   catch (error) {
      return [null, error as E];
   }
}

export function unwrapSync<T, E = Error>(
   fn: () => T,
): [T, null] | [null, E] {
   try {
      return [fn(), null];
   }
   catch (error) {
      return [null, error as E];
   }
}

export const UNICODE_GLYPH_REGEX = /[\p{L}\p{N}]/gu; // only letters and numbers

export function cleanUpBlobUrls(blobUrls: string[] | undefined) {
   if (blobUrls) {
      blobUrls.forEach((url) => {
         if (url) URL.revokeObjectURL(url);
      });
   }
}
