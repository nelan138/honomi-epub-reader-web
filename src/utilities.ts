import type { DeferredPromise } from '@src/types';
import { router } from '@src/router';

/* *** */

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
