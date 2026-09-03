import { db } from './db';
import type { CategoryRecord } from '@src/types/category';

async function addCategoryToDB(
   category: Pick<CategoryRecord, 'name' | 'expanded'>,
): Promise<{ id: number; displayOrder: number }> {
   const store = db.categories;
   const last = await db.categories.orderBy('displayOrder').last();
   const maxDisplayOrder = last?.displayOrder ?? 0;

   const id = await store.add({
      ...category,
      displayOrder: maxDisplayOrder + 1,
   });

   return { id, displayOrder: maxDisplayOrder + 1 };
}

async function getCategoriesFromDB(): Promise<CategoryRecord[]> {
   const store = db.categories;
   return await store.toArray();
}

async function deleteCategoryFromDB(categoryId: number): Promise<void> {
   const categoryStore = db.categories;
   const bookStore = db.books;
   await db.transaction('readwrite', bookStore, categoryStore, async () => {
      const record = await categoryStore.where(':id').equals(categoryId).firstKey();
      if (!record) throw new Error('Category does not exist!');

      await bookStore.where('categoryId').equals(categoryId).delete();
      await categoryStore.delete(categoryId);
   });
}

async function renameCategoryInDB(categoryId: number, newName: string): Promise<void> {
   const store = db.categories;
   await db.transaction('rw', store, async () => {
      const record = await store.get(categoryId) as Required<CategoryRecord> | undefined;
      if (record === undefined) throw new Error('Category does not exist');

      await store.update(categoryId, {
         name: newName,
      });
   });
}

async function updateCategoryExpanded(categoryId: number, expanded: boolean): Promise<void> {
   const store = db.categories;

   const record = await store.where(':id').equals(categoryId).firstKey();
   if (!record) throw new Error('Category does not exist!');

   await store.update(categoryId, { expanded });
}

async function expandCategoryInDB(categoryId: number): Promise<void> {
   return await updateCategoryExpanded(categoryId, true);
}

async function collapseCategoryInDB(categoryId: number): Promise<void> {
   return await updateCategoryExpanded(categoryId, false);
}

export {
   addCategoryToDB,
   collapseCategoryInDB,
   deleteCategoryFromDB,
   expandCategoryInDB,
   getCategoriesFromDB,
   renameCategoryInDB,
};
