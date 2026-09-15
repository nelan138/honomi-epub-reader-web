export type Section = {
   content: string;
   idref: string;
};

/**
 * * What parsed from parser
 */
export type Book = {
   cover: Blob | null;
   metadata: {
      title: string;
      creator: string;
      publisher: string;
      language: string;
   };
   sections: Section[];

   charCount: number;
   images: Map<string, Blob>;
};

/**
 * * Represents a record in the database.
 */
export type BookRecord = Book & {
   id: number;
   shelfId: number;
   /** count of how many chars user has read of this book */
   readCharCount: number;
};

/**
 * * Use for UI
 */
export type BookCard = Pick<
   BookRecord,
   | 'id'
   | 'shelfId'
   | 'readCharCount'
   | 'metadata'
   | 'cover'
   | 'charCount'
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

export type DeferredPromise<T> = {
   promise: Promise<T>;
   resolve: (value: T | PromiseLike<T>) => void;
   reject: (reason?: unknown) => void;
};

//* -------------------- ERROR TYPES ---------------------- */

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
