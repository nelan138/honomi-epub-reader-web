/* * CONSTANTS * */

import type { Book } from '@src/services/epub/epubParser.ts';

export const domParser = new DOMParser();
export const xmlSerializer = new XMLSerializer();

/* * FUNCTIONS * */

export async function tryCatch<T>(promise: Promise<T>): Promise<[T, null] | [null, Error]> {
   try {
      const data = await promise;
      return [data, null];
   }
   catch (error) {
      const safeError = error instanceof Error ? error : new Error(String(error));
      return [null, safeError];
   }
}

export function cleanUpBlobUrls(blobUrls: string[] | undefined | null) {
   if (!blobUrls) return;
   blobUrls.forEach((url) => URL.revokeObjectURL(url));
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

export function debugBook(book: Book): void {
   console.groupCollapsed(
      `%c[Book Debug] %c${book.metadata.title || 'Untitled'}`,
      'color: #3b82f6; font-weight: bold;',
      'color: inherit;',
   );

   // 1. High-level Metadata & Stats
   console.group('Overview');
   console.log('Title:', book.metadata.title);
   console.log('Creator:', book.metadata.creator);
   console.log('Publisher:', book.metadata.publisher);
   console.log('Language:', book.metadata.language);
   console.log('Total Characters:', book.totalCharacters.toLocaleString());
   console.log(
      'Cover:',
      book.cover ? `${book.cover.type || 'blob'} (${(book.cover.size / 1024).toFixed(1)} KB)` : 'None',
   );
   console.groupEnd();

   // 2. Sections Summary (compact table view)
   console.groupCollapsed(`Sections (${book.sections.length})`);
   console.table(
      book.sections.map((section, index) => ({
         index,
         idref: section.idref,
         charLength: section.content.length,
         snippet: section.content.slice(0, 40).replace(/\s+/g, ' ') + '...',
      })),
   );
   console.groupEnd();

   // 3. Images Summary (IDs, MIME types, and sizes)
   const imageEntries = Object.entries(book.images);
   console.groupCollapsed(`Images (${imageEntries.length})`);
   console.table(
      imageEntries.map(([id, blob]) => ({
         id,
         type: blob.type || 'unknown',
         sizeKB: +(blob.size / 1024).toFixed(2),
      })),
   );
   console.groupEnd();

   // 4. Raw object handle for interactive inspection if needed
   console.log('Raw Book Object:', book);

   console.groupEnd();
}

export class NotFoundError extends Error {
   readonly entity?: string;

   constructor(
      message: string,
      options?: { entity?: string; cause?: unknown },
   ) {
      super(message, { cause: options?.cause });
      this.name = 'NotFoundError';
      this.entity = options?.entity;
   }
}

export class RuntimeError extends Error {
   constructor(message: string, options?: { cause?: unknown }) {
      super(message, options);
      this.name = 'RuntimeError';
   }
}
