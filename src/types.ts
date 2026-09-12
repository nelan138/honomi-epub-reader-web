export type Idref = string;
export type ResolvedPath = string;
export type RawXTHMLContent = string;

export const XLINK_NS = 'http://www.w3.org/1999/xlink';

export type SpineItem = {
   idref: Idref;
   // Can treat this as resource path to use in assets map
   resolvedHref: ResolvedPath;
   mediaType: string;

   linear: boolean; // false <=> (footnotes, appendices, etc.)
};

export type Book = {
   // Metadata
   title: string;
   creator: string;
   publisher: string;
   language: string;
   cover: Blob;

   // Book Content
   spine: SpineItem[];
   assets: Record<ResolvedPath, Uint8Array>;
   /** Map<Idref, RawXTHMLContent> */
   spineItemContentMap: Map<Idref, RawXTHMLContent>;
   totalCharacterCount: number;
};

/**
 * * Represents a record in the database.
 */
export type BookRecord = Book & {
   id: number;
   shelfId: number;
   /** count of how many chars user has read of this book */
   readCharacterCount: number;
};

/**
 * Use for UI
 */
export type BookCard = Pick<
   BookRecord,
   | 'id'
   | 'shelfId'
   | 'readCharacterCount'
   | 'totalCharacterCount'
   | 'cover'
   | 'title'
   | 'creator'
   | 'publisher'
   | 'language'
>;

/**
 * * Represents a record in the database.
 */
export type ShelfRecord = {
   id: number;
   name: string;

   displayOrder: number; // The lower the number, the higher the shelf is displayed in the UI
   expanded: boolean;
};

export type ShelfOption = { id: number; name: string };

export type Chapter = {
   /** ! HTML string */
   idref: string;
   content: string;
   /** ! Remember to provoke these after use */
   blobUrls: string[] | undefined;
   /** Accessing character count of each <p> via p-index: Map<p-index, char count> */
   characterCount: Map<number, number>;
};

export type DeferredPromise<T> = {
   promise: Promise<T>;
   resolve: (value: T | PromiseLike<T>) => void;
   reject: (reason?: unknown) => void;
};

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
