import { Dexie, type EntityTable } from 'dexie';
import {
   type BookRecord,
   NotFoundError,
   type ShelfRecord,
   UnexpectedRuntimeError,
} from '@src/types';
import { unwrapAsync } from '@src/utilities.ts';

const DB_NAME = 'Honomi';
const DB_VERSION = 1;

export const db = new Dexie(DB_NAME) as Dexie & {
   books: EntityTable<BookRecord, 'id'>;
   shelves: EntityTable<ShelfRecord, 'id'>;
};

db.version(DB_VERSION).stores({
   books: '++id, shelfId',
   shelves: '++id, &name, &displayOrder',
});

export const DEFAULT_SHELF_ID = 1;
export const defaultShelf: Readonly<ShelfRecord> = {
   id: DEFAULT_SHELF_ID,
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
   const [shelf, error] = await unwrapAsync(db.shelves.get(DEFAULT_SHELF_ID));

   if (error) {
      throw new UnexpectedRuntimeError(
         `Failed to read default shelf: ${error.message}`,
      );
   }

   if (!shelf) {
      throw new NotFoundError(
         `Default shelf (ID: ${DEFAULT_SHELF_ID}) not found in DB`,
      );
   }
});
