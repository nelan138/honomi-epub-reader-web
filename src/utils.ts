/* * CONSTANTS * */

export const domParser = new DOMParser();
export const xmlSerializer = new XMLSerializer();

export const UNICODE_GLYPH_REGEX = /[\p{L}\p{N}]/gu; // only letters and numbers
export const DANGEROUS_CHAR_REGEX = /[<>"'`;/\\|&$]/;

export async function unwrapAsync<T>(promise: Promise<T>): Promise<[T, null] | [null, Error]> {
   try {
      const data = await promise;
      return [data, null];
   }
   catch (error) {
      const safeError = error instanceof Error ? error : new Error(String(error));
      return [null, safeError];
   }
}

/* * FUNCTIONS * */

export function unwrapSync<T>(fn: () => T): [T, null] | [null, Error] {
   try {
      return [fn(), null];
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

/* OBJECTS & CLASSES */

export class EpubParsingError extends Error {
   constructor(message: string) {
      super(message);
      this.name = this.constructor.name;
   }
}

export class UnexpectedRuntimeError extends Error {
   constructor(message: string) {
      super(message);
      this.name = this.constructor.name;
   }
}

export class NotFoundError extends Error {
   constructor(message: string) {
      super(message);
      this.name = this.constructor.name;
   }
}
