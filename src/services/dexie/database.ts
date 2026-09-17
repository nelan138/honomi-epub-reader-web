import { Dexie, type EntityTable } from 'dexie';
import { NotFoundError, UnexpectedRuntimeError, unwrapAsync } from '@src/utils';
import type { Book } from '@src/services/epub/epubParser.ts';

/* *** */

export type BookRecord = Book & {
   id: number;
   shelfId: number;
   readCharCount: number; // chars user has read of this book */
};

export type Shelf = {
   name: string;
   expanded: boolean;
};

export type ShelfRecord = Shelf & {
   id: number;
   displayOrder: number; // The lower the number, the higher the shelf is displayed in the UI
};

export const db = new Dexie('Honomi') as Dexie & {
   books: EntityTable<BookRecord, 'id'>;
   shelves: EntityTable<ShelfRecord, 'id'>;
};

db.version(1).stores({
   books: '++id, shelfId',
   shelves: '++id, &name, &displayOrder',
});

export const defaultShelf: Readonly<ShelfRecord> = {
   id: 1,
   displayOrder: 1,
   name: 'Your Books',
   expanded: true,
};

// first created
db.on('populate', () => {
   const clone = { ...defaultShelf };
   db.shelves.add(clone);
});

// every time the database opens
db.on('ready', async () => {
   const [shelf, error] = await unwrapAsync(db.shelves.get(defaultShelf.id));

   if (error) {
      throw new UnexpectedRuntimeError(
         `Failed to read default shelf: ${error.message}`,
      );
   }

   if (!shelf) {
      throw new NotFoundError(
         `Default shelf (ID: ${defaultShelf.id}) not found in DB`,
      );
   }
});
