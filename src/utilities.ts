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

export async function unwrapAsync<T>(
   promise: Promise<T>,
): Promise<[T, null] | [null, Error]> {
   try {
      const data = await promise;
      return [data, null];
   }
   catch (error) {
      const safeError = error instanceof Error
         ? error
         : new Error(String(error));
      return [null, safeError];
   }
}

export function unwrapSync<T>(
   fn: () => T,
): [T, null] | [null, Error] {
   try {
      return [fn(), null];
   }
   catch (error) {
      const safeError = error instanceof Error
         ? error
         : new Error(String(error));
      return [null, safeError];
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

const MIME_MAP: Record<string, string> = {
   jpg: 'image/jpeg',
   jpeg: 'image/jpeg',
   png: 'image/png',
   svg: 'image/svg+xml',
   gif: 'image/gif',
   webp: 'image/webp',
   avif: 'image/avif',
};

export function getMimeType(path: string): string {
   const ext = path.split('.').pop()?.toLowerCase() ?? '';
   return MIME_MAP[ext] ?? 'application/octet-stream';
}

export type DeferredPromise<T> = {
   promise: Promise<T>;
   resolve: (value: T | PromiseLike<T>) => void;
   reject: (reason?: unknown) => void;
};

export function createDeferredPromise<T>(): DeferredPromise<T> {
   let resolve!: (value: T | PromiseLike<T>) => void;
   let reject!: (reason?: unknown) => void;

   const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
   });

   return { promise, resolve, reject };
}

export const DANGEROUS_CHAR_REGEX = /[<>"'`;/\\|&$]/;
