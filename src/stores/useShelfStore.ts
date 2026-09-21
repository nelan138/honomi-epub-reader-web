import { defineStore } from 'pinia';
import { NotFoundError, RuntimeError, tryCatch } from '@src/utils';
import {
   addShelfToDB,
   collapseShelfInDB,
   deleteShelfFromDB,
   expandShelfInDB,
   getShelvesFromDB,
   renameShelfInDB,
   swapShelfDisplayOrdersInDB,
} from '@src/services/dexie/shelfRepo.ts';
import { defaultShelf, type ShelfRecord } from '@src/services/dexie/database.ts';

/* *** */

export const useShelfStore = defineStore('shelf', () => {
   // STATEs
   const shelves = ref<ShelfRecord[]>([]);

   const isLoading = ref(false);
   const isLoaded = ref(false);

   // ACTIONs
   function reset() {
      shelves.value = [];
      isLoading.value = false;
      isLoaded.value = false;
   }

   const syncWithDB = async () => {
      const [data, error] = await tryCatch(getShelvesFromDB());
      if (error) throw error;

      shelves.value = data;
   };

   async function load() {
      if (isLoading.value || isLoaded.value) return;
      isLoading.value = true;

      try {
         await syncWithDB();
         isLoaded.value = true;
      }
      finally {
         isLoading.value = false;
      }
   }

   async function addShelf(name: string) {
      const [result, error] = await tryCatch(addShelfToDB({
         name,
         expanded: true,
      }));

      if (error) {
         await syncWithDB();
         throw error;
      }

      shelves.value.push({ id: result.id, displayOrder: result.displayOrder, name, expanded: true });
   }

   const shiftDisplayOrdersUp = (startFrom: number) => {
      shelves.value.forEach((shelf) => {
         if (shelf.displayOrder >= startFrom) shelf.displayOrder -= 1;
      });
   };

   async function deleteShelf(shelfId: number) {
      // UI first
      const targetShelf = shelves.value.find((shelf) => shelf.id === shelfId);
      if (!targetShelf) throw new NotFoundError('Shelf does not exist!');

      shelves.value = shelves.value.filter((shelf) => shelf.id !== shelfId);
      shiftDisplayOrdersUp(targetShelf.displayOrder);

      // Sync
      const [_, error] = await tryCatch(deleteShelfFromDB(shelfId));
      if (error) {
         syncWithDB();
         throw error;
      }
   }

   async function renameShelf(shelfId: number, newName: string) {
      // UI first
      const targetShelf = shelves.value.find((shelf) => shelf.id === shelfId);
      if (!targetShelf) throw new NotFoundError('Shelf does not exist!');

      targetShelf.name = newName;

      // Sync
      const [_, error] = await tryCatch(renameShelfInDB(shelfId, newName));
      if (error) {
         await syncWithDB();
         throw error;
      }
   }

   async function collapseShelf(shelfId: number) {
      // UI first
      const targetShelf = shelves.value.find((shelf) => shelf.id === shelfId);
      if (!targetShelf) throw new NotFoundError('Shelf does not exist!');

      targetShelf.expanded = false;

      // Sync
      const [_, error] = await tryCatch(collapseShelfInDB(shelfId));
      if (error) {
         await syncWithDB();
         throw error;
      }
   }

   async function expandShelf(shelfId: number) {
      // UI first
      const targetShelf = shelves.value.find((shelf) => shelf.id === shelfId);
      if (!targetShelf) throw new NotFoundError('Shelf does not exist!');

      targetShelf.expanded = true;

      // Sync
      const [_, error] = await tryCatch(expandShelfInDB(shelfId));
      if (error) {
         await syncWithDB();
         throw error;
      }
   }

   const moveShelf = async (shelfId: number, direction: 'up' | 'down') => {
      // UI first
      const indexOfTargetShelf = shelves.value.findIndex((shelf) => shelf.id === shelfId);
      const targetShelf = shelves.value[indexOfTargetShelf];
      if (!targetShelf) throw new NotFoundError('Shelf does not exist!');

      const minDisplayOrder = defaultShelf.displayOrder + 1;
      const maxDisplayOrder = defaultShelf.displayOrder + shelves.value.length;

      const newDisplayOrder = direction === 'up' ? targetShelf.displayOrder - 1 : targetShelf.displayOrder + 1;

      if (newDisplayOrder < minDisplayOrder || newDisplayOrder > maxDisplayOrder)
         throw new RuntimeError('Cannot move shelf beyond the bounds of the shelf list!');

      const indexOfShelfToSwap = shelves.value.findIndex(
         (shelf) => shelf.displayOrder === newDisplayOrder,
      );

      const shelfToSwap = shelves.value[indexOfShelfToSwap];
      if (!shelfToSwap) throw new NotFoundError('Shelf to swap does not exist!');

      [targetShelf.displayOrder, shelfToSwap.displayOrder] = [
         shelfToSwap.displayOrder,
         targetShelf.displayOrder,
      ];

      shelves.value[indexOfTargetShelf] = shelfToSwap;
      shelves.value[indexOfShelfToSwap] = targetShelf;

      const [_, error] = await tryCatch(
         swapShelfDisplayOrdersInDB(targetShelf.id, shelfToSwap.id),
      );

      if (error) {
         await syncWithDB();
         throw error;
      }
   };

   async function moveShelfUp(shelfId: number) {
      await moveShelf(shelfId, 'up');
      return;
   }

   async function moveShelfDown(shelfId: number) {
      await moveShelf(shelfId, 'down');
      return;
   }

   return {
      shelves,
      isLoading,
      isLoaded,
      load,
      reset,
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
