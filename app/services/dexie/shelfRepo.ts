import Dexie from 'dexie';
import { db } from './database';

export async function addShelfToDB(shelf: Shelf): Promise<{ id: number }> {
   const store = db.shelves;

   const result = await store.add(shelf);
   return { id: result };
}

export async function getShelvesFromDB(): Promise<ShelfRecord[]> {
   const shelves = await db.shelves.toArray();

   return shelves;
}

export async function swapShelfDisplayOrdersInDB(shelfId1: number, shelfId2: number): Promise<void> {
   await db.transaction('rw', db.shelves, async () => {
      const store = db.shelves;

      const shelf1 = await store.get(shelfId1);
      const shelf2 = await store.get(shelfId2);

      if (!shelf1 || !shelf2) throw new Error('Shelf does not exist!');

      const tempDisplayOrder = shelf1.displayOrder;

      await store.update(shelfId1, { displayOrder: -1 }); // bypass unique key constraint

      await store.update(shelfId2, { displayOrder: tempDisplayOrder });
      await store.update(shelfId1, { displayOrder: shelf2.displayOrder });
   });
}

/**
 * * Deletes a shelf and all its associated books from the database.
 * ! Also makes sure display orders are updated after deletion
 * For example (1->2->3->4->5) becomes (1->2->3->4) if shelf 2 is deleted
 */
export async function deleteShelfFromDB(shelfId: number): Promise<void> {
   await db.transaction('readwrite', [db.books, db.shelves], async () => {
      const displayOrder = db.shelves.get(shelfId);
      if (!displayOrder) throw new Dexie.NotFoundError('Shelf does not exist');

      await db.books.where('shelfId').equals(shelfId).delete();
      await db.shelves.delete(shelfId);

      await db.shelves
         .where('displayOrder')
         .above(displayOrder)
         .modify((shelf) => {
            shelf.displayOrder -= 1;
         });
   });
}

export async function renameShelfInDB(shelfId: number, newName: string): Promise<void> {
   db.shelves.update(shelfId, { name: newName }).then((result) => {
      if (!result) throw new Dexie.NotFoundError('Shelf does not exist');
   });
}
