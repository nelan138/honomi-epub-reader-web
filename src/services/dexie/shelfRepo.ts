import { db } from '@src/services/dexie/database.ts';
import type { ShelfRecord } from '@src/types/shelf.ts';

async function addShelfToDB(
   shelf: Pick<ShelfRecord, 'name' | 'expanded'>,
): Promise<{ id: number; displayOrder: number }> {
   const store = db.shelves;
   const last = await db.shelves.orderBy('displayOrder').last();
   const maxDisplayOrder = last?.displayOrder ?? 0;


   const id = await store.add({
      ...shelf,
      displayOrder: maxDisplayOrder + 1,
   });

   return { id, displayOrder: maxDisplayOrder + 1 };
}

async function getShelvesFromDB(): Promise<ShelfRecord[]> {
   const store = db.shelves;
   return await store.toArray();
}

async function swapShelfDisplayOrdersInDB(
   shelfId1: number,
   shelfId2: number,
): Promise<void> {
   const store = db.shelves;
   await db.transaction('rw', store, async () => {
      const shelf1 = await store.get(shelfId1);
      const shelf2 = await store.get(shelfId2);

      if (!shelf1 || !shelf2) throw new Error('Shelf does not exist!');

      const tempDisplayOrder = shelf1.displayOrder;

      await store.update(shelfId1, { displayOrder: -1 });
      await store.update(shelfId2, { displayOrder: tempDisplayOrder });
      await store.update(shelfId1, { displayOrder: shelf2.displayOrder });
   });
}

/**
 * * Deletes a shelf and all its associated books from the database.
 * ! Also makes sure display orders are updated after deletion
 * For example (1->2->3->4->5) becomes (1->2->3->4) if shelf 2 is deleted
 */
async function deleteShelfFromDB(shelfId: number): Promise<void> {
   const shelfStore = db.shelves;
   const bookStore = db.books;
   await db.transaction('readwrite', bookStore, shelfStore, async () => {
      const record = await shelfStore.get(shelfId);
      if (!record) throw new Error('Shelf does not exist!');

      await bookStore.where('shelfId').equals(shelfId).delete();
      await shelfStore.delete(shelfId);
      await shelfStore.where('displayOrder').above(record.displayOrder).modify(
         (shelf) => {
            shelf.displayOrder -= 1;
         },
      );
   });
}

async function renameShelfInDB(
   shelfId: number,
   newName: string,
): Promise<void> {
   const store = db.shelves;
   await db.transaction('rw', store, async () => {
      const record = await store.get(shelfId) as
         | Required<ShelfRecord>
         | undefined;
      if (record === undefined) throw new Error('Shelf does not exist');

      await store.update(shelfId, {
         name: newName,
      });
   });
}

async function updateShelfExpanded(
   shelfId: number,
   expanded: boolean,
): Promise<void> {
   const store = db.shelves;

   const record = await store.where(':id').equals(shelfId).firstKey();
   if (!record) throw new Error('Shelf does not exist!');

   await store.update(shelfId, { expanded });
}

async function expandShelfInDB(shelfId: number): Promise<void> {
   return await updateShelfExpanded(shelfId, true);
}

async function collapseShelfInDB(shelfId: number): Promise<void> {
   return await updateShelfExpanded(shelfId, false);
}

export {
   addShelfToDB,
   collapseShelfInDB,
   deleteShelfFromDB,
   expandShelfInDB,
   getShelvesFromDB,
   renameShelfInDB,
   swapShelfDisplayOrdersInDB,
};
