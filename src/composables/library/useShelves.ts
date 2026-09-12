import { onMounted, ref } from 'vue';
import type { ShelfRecord } from '@src/types/shelf';
import {
   addShelfToDB,
   collapseShelfInDB,
   deleteShelfFromDB,
   expandShelfInDB,
   getShelvesFromDB,
   renameShelfInDB,
   swapShelfDisplayOrdersInDB,
} from '@src/services/dexie/shelfRepo';
import { defaultShelf } from '@src/services/dexie/database';
import { unwrapAsync } from '@src/utilities.ts';
import Dexie from 'dexie';
import { NotFoundError, UnexpectedRuntimeError } from '@src/types/errors.ts';

export function useShelves() {
   const shelves = ref<ShelfRecord[]>([]);

   const syncWithDB = async () => {
      const [shelfRecords, error] = await unwrapAsync(getShelvesFromDB());
      if (error) {
         alert('Failed to sync with database: ' + error.message);
         shelves.value = [];
         return;
      }

      shelves.value = shelfRecords;
      shelves.value.sort((a, b) => a.displayOrder - b.displayOrder); // ! to display in order
   };

   onMounted(syncWithDB); // runs in the background

   const shiftDisplayOrdersUp = (startFrom: number) => {
      shelves.value.forEach((shelf) => {
         if (shelf.displayOrder >= startFrom) shelf.displayOrder -= 1;
      });
   };

   /* All operations follow Optimistic UI Update pattern:
      * 1. Update the UI first
      * 2. Then update the database
      ! 3. If database update fails, rollback with syncWithDB() and alert the user
   */

   const addShelf = async (name: string) => {
      const shelf: Omit<ShelfRecord, 'id' | 'displayOrder'> = {
         name,
         expanded: true,
      };

      const [result, error] = await unwrapAsync(addShelfToDB(shelf));
      if (error) {
         if (error instanceof Dexie.DexieError) {
            await syncWithDB();
            alert('Failed to add shelf: ' + (error as Error).message);
            return;
         }
         else { throw new UnexpectedRuntimeError(error.message); }
      }
      const { id, displayOrder } = result;
      const addedShelf: ShelfRecord = { id, displayOrder, ...shelf };

      shelves.value.push(addedShelf);
   };

   const deleteShelf = async (shelfId: number) => {
      const targetShelf = shelves.value.find((shelf) => shelf.id === shelfId);
      if (!targetShelf) throw new NotFoundError('Shelf does not exist!'); // ! only happens if i made a mistake somewhere, otherwise should never happen

      shelves.value = shelves.value.filter((shelf) => shelf.id !== shelfId);
      shiftDisplayOrdersUp(targetShelf.displayOrder);

      const [_, error] = await unwrapAsync(deleteShelfFromDB(shelfId));
      if (error) {
         if (error instanceof NotFoundError) throw error; // ! only happens if i made a mistake somewhere, otherwise should never happen
         if (error instanceof Dexie.DexieError) {
            await syncWithDB();
            alert('Failed to delete shelf: ' + (error as Error).message);
         }
         else { throw new UnexpectedRuntimeError(error.message); }
      }
   };

   const renameShelf = async (shelfId: number, newName: string) => {
      const targetShelf = shelves.value.find((shelf) => shelf.id === shelfId);
      if (!targetShelf) throw new NotFoundError('Shelf does not exist!'); // ! only happens if i made a mistake somewhere, otherwise should never happen

      targetShelf.name = newName;

      const [_, error] = await unwrapAsync(renameShelfInDB(shelfId, newName));
      if (error) {
         if (error instanceof NotFoundError) throw error; // ! only happens if i made a mistake somewhere, otherwise should never happen
         if (error instanceof Dexie.DexieError) {
            await syncWithDB();
            alert('Failed to rename shelf: ' + (error as Error).message);
         }
         else { throw new UnexpectedRuntimeError(error.message); }
      }
   };

   const collapseShelf = async (shelfId: number) => {
      const targetShelf = shelves.value.find((shelf) => shelf.id === shelfId);
      if (!targetShelf) throw new NotFoundError('Shelf does not exist!'); // ! only happens if i made a mistake somewhere, otherwise should never happen

      targetShelf.expanded = false;
      const [_, error] = await unwrapAsync(collapseShelfInDB(shelfId));
      if (error) {
         if (error instanceof NotFoundError) throw error; // ! only happens if i made a mistake somewhere, otherwise should never happen
         if (error instanceof Dexie.DexieError) {
            await syncWithDB();
            alert('Failed to collapse shelf: ' + (error as Error).message);
         }
         else { throw new UnexpectedRuntimeError(error.message); }
      }
   };

   const expandShelf = async (shelfId: number) => {
      const targetShelf = shelves.value.find((shelf) => shelf.id === shelfId);
      if (!targetShelf) throw new NotFoundError('Shelf does not exist!'); // ! only happens if i made a mistake somewhere, otherwise should never happen

      targetShelf.expanded = true;
      const [_, error] = await unwrapAsync(expandShelfInDB(shelfId));
      if (error) {
         if (error instanceof NotFoundError) throw error;
         if (error instanceof Dexie.DexieError) {
            await syncWithDB();
            alert('Failed to expand shelf: ' + (error as Error).message);
         }
         else { throw new UnexpectedRuntimeError(error.message); }
      }
   };

   async function moveShelf(shelfId: number, direction: 'up' | 'down') {
      const indexOfTargetShelf = shelves.value.findIndex((shelf) =>
         shelf.id === shelfId
      );
      const targetShelf = shelves.value[indexOfTargetShelf];
      if (!targetShelf) throw new NotFoundError('Shelf does not exist!'); // ! only happens if i made a mistake somewhere, otherwise should never happen

      const minDisplayOrder = defaultShelf.displayOrder + 1;
      const maxDisplayOrder = defaultShelf.displayOrder + shelves.value.length;

      const newDisplayOrder = direction === 'up'
         ? targetShelf.displayOrder - 1
         : targetShelf.displayOrder + 1;

      if (
         newDisplayOrder < minDisplayOrder
         || newDisplayOrder > maxDisplayOrder
      ) {
         {
            alert('Cannot move shelf further in that direction!');
         }
         return;
      }

      const indexOfShelfToSwap = shelves.value.findIndex(
         (shelf) => shelf.displayOrder === newDisplayOrder,
      );

      const shelfToSwap = shelves.value[indexOfShelfToSwap];
      if (!shelfToSwap)
         throw new NotFoundError('Shelf to swap does not exist!'); // ! only happens if i made a mistake somewhere, otherwise should never happen

      [targetShelf.displayOrder, shelfToSwap.displayOrder] = [
         shelfToSwap.displayOrder,
         targetShelf.displayOrder,
      ];

      shelves.value[indexOfTargetShelf] = shelfToSwap;
      shelves.value[indexOfShelfToSwap] = targetShelf;

      const [_, error] = await unwrapAsync(
         swapShelfDisplayOrdersInDB(targetShelf.id, shelfToSwap.id),
      );
      if (error) {
         if (error instanceof NotFoundError) throw error;
         if (error instanceof Dexie.DexieError) {
            await syncWithDB();
            alert('Failed to move shelf: ' + (error as Error).message);
         }
         else { throw new UnexpectedRuntimeError(error.message); }
      }
   }
   const moveShelfUp = async (shelfId: number) =>
      await moveShelf(shelfId, 'up');

   const moveShelfDown = async (shelfId: number) =>
      await moveShelf(shelfId, 'down');

   return {
      shelves,
      addShelf,
      deleteShelf,
      renameShelf,
      collapseShelf,
      expandShelf,
      moveShelfUp,
      moveShelfDown,
   };
}
