import { Dexie, type EntityTable } from 'dexie';
import type { BookRecord } from '@src/types/book';
import type { ShelfRecord } from '@src/types/shelf.ts';
import { addShelfToDB } from '@src/services/dexie/shelfRepo.ts';

const DB_NAME = 'Honomi';
const DB_VERSION = 1;

const db = new Dexie(DB_NAME) as Dexie & {
   books: EntityTable<BookRecord, 'id'>;
   shelves: EntityTable<ShelfRecord, 'id'>;
};

db.version(DB_VERSION).stores({
   books: '++id, shelfId',
   shelves: '++id, &name, &displayOrder',
});

const defaultShelf: ShelfRecord = {
   id: 1, // ? maybe not
   displayOrder: 1, // ? maybe not
   name: 'Your Books',
   expanded: true,
};

db.on('ready', async () => {
   const shelf = await db.shelves.where('name').equals(defaultShelf.name)
      .first();
   if (!shelf) throw new Error('Default shelf not found in database!');
   defaultShelf.id = shelf.id;
   defaultShelf.displayOrder = shelf.displayOrder;
});

db.on('populate', async () => {
   try {
      const { name, expanded } = defaultShelf;
      const { id, displayOrder } = await addShelfToDB({ name, expanded });
      defaultShelf.id = id;
      defaultShelf.displayOrder = displayOrder;
   }
   catch {
      console.log('Default shelf already initialized');
   }
});

export { db, defaultShelf };
