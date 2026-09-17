import { defineStore } from 'pinia';
import { NotFoundError, UnexpectedRuntimeError, unwrapAsync } from '@src/utils';
import {
   addShelfToDB,
   collapseShelfInDB,
   deleteShelfFromDB,
   expandShelfInDB,
   getShelvesFromDB,
   renameShelfInDB,
   swapShelfDisplayOrdersInDB,
} from '@src/services/dexie/shelfRepo.ts';
import { Dexie } from 'dexie';
import { defaultShelf, type ShelfRecord } from '@src/services/dexie/database.ts';

/* *** */

export const useShelfStore = defineStore('shelf', () => {
   const shelves = ref<ShelfRecord[]>([]);

   const syncWithDB = async () => {
      const [data, error] = await unwrapAsync(getShelvesFromDB());
      if (error) {
         if (error instanceof Dexie.DexieError) {
            console.error('Failed to sync with database: ' + (error as Error).message);
            shelves.value = [];
            return;
         }
         else { throw error; }
      }
      shelves.value = data;
   };

   let isLoading = false;
   let isLoaded = false;

   async function load() {
      if (isLoading || isLoaded) return;
      isLoading = true;
      await syncWithDB();
      isLoading = false;
      isLoaded = true;
   }

   async function addShelf(name: string) {
      const [data, error] = await unwrapAsync(addShelfToDB({
         name,
         expanded: true,
      }));

      if (error) {
         if (error instanceof Dexie.DexieError) {
            await syncWithDB();
            console.error('Failed to add shelf: ' + (error as Error).message);
            return;
         }
         else { throw new UnexpectedRuntimeError(error.message); }
      }

      const { id, displayOrder } = data;
      shelves.value.push({ id, displayOrder, name, expanded: true });
   }

   const shiftDisplayOrdersUp = (startFrom: number) => {
      shelves.value.forEach((shelf) => {
         if (shelf.displayOrder >= startFrom) shelf.displayOrder -= 1;
      });
   };

   async function deleteShelf(shelfId: number) {
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
   }

   async function renameShelf(shelfId: number, newName: string) {
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
   }

   async function collapseShelf(shelfId: number) {
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
   }

   async function expandShelf(shelfId: number) {
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
   }

   const moveShelf = async (shelfId: number, direction: 'up' | 'down') => {
      const indexOfTargetShelf = shelves.value.findIndex((shelf) => shelf.id === shelfId);
      const targetShelf = shelves.value[indexOfTargetShelf];
      if (!targetShelf) throw new NotFoundError('Shelf does not exist!'); // ! only happens if i made a mistake somewhere, otherwise should never happen

      const minDisplayOrder = defaultShelf.displayOrder + 1;
      const maxDisplayOrder = defaultShelf.displayOrder + shelves.value.length;

      const newDisplayOrder = direction === 'up' ? targetShelf.displayOrder - 1 : targetShelf.displayOrder + 1;

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
      if (!shelfToSwap) throw new NotFoundError('Shelf to swap does not exist!'); // ! only happens if i made a mistake somewhere, otherwise should never happen

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
   };

   async function moveShelfUp(shelfId: number) {
      return await moveShelf(shelfId, 'up');
   }

   async function moveShelfDown(shelfId: number) {
      return await moveShelf(shelfId, 'down');
   }

   return {
      shelves,
      load,
      syncWithDB,
      addShelf,
      deleteShelf,
      renameShelf,
      collapseShelf,
      expandShelf,
      moveShelfUp,
      moveShelfDown,
   };
});
