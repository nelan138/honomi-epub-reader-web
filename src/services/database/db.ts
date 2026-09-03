import { Dexie, type EntityTable } from 'dexie';
import type { BookRecord } from '@src/types/book';
import type { CategoryRecord } from '@src/types/category';
import { addCategoryToDB } from '@src/services/database/categoryRepo';

const DB_NAME = 'Honomi';
const DB_VERSION = 1;

const db = new Dexie(DB_NAME) as Dexie & {
   books: EntityTable<BookRecord, 'id'>;
   categories: EntityTable<CategoryRecord, 'id'>;
};

db.version(DB_VERSION).stores({
   books: '++id, categoryId',
   categories: '++id, &name, &displayOrder',
});

const defaultCategory: CategoryRecord = {
   id: 1, // ? maybe not
   displayOrder: 0, // ? maybe not
   name: 'Your Library',
   expanded: true,
};

db.on('populate', async () => {
   try {
      const { name, expanded } = defaultCategory;
      const { id, displayOrder } = await addCategoryToDB({ name, expanded });
      defaultCategory.id = id;
      defaultCategory.displayOrder = displayOrder;
   }
   catch {
      console.log('Default category already initialized');
   }
});

export { db, defaultCategory };
