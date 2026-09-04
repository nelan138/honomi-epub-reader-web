import { onMounted, ref } from 'vue';
import type { ShelfRecord, UIShelf } from '@src/types/shelf';
import {
   addShelfToDB,
   collapseShelfInDB,
   deleteShelfFromDB,
   expandShelfInDB,
   getShelvesFromDB,
   renameShelfInDB,
   swapShelfDisplayOrdersInDB,
} from '@src/services/dexie/shelfRepo.ts';
import { defaultShelf } from '@src/services/dexie/database.ts';

function useShelves() {
   const shelves = ref<UIShelf[]>([]);
   const syncWithDB = async () => {
      shelves.value = await getShelvesFromDB();
      shelves.value.sort((a, b) => a.displayOrder - b.displayOrder);
   };

   const shiftDisplayOrdersUp = (startFrom: number) => {
      shelves.value.forEach((shelf) => {
         if (shelf.displayOrder >= startFrom) shelf.displayOrder -= 1;
      });
   };
   onMounted(async () => {
      await syncWithDB();
   });

   /* All operations follow Optimistic UI Update pattern:
      * 1. Update the UI first
      * 2. Then update the database
      ! 3. If database update fails, rollback with syncWithDB() and alert the user
   */

   const addShelf = async (shelf: Omit<ShelfRecord, 'id' | 'displayOrder'>) => {
      try {
         const { id, displayOrder } = await addShelfToDB(shelf);
         const addedShelf: UIShelf = { id, displayOrder, ...shelf };
         shelves.value.push(addedShelf);
      }
      catch (error) {
         alert('Failed to add shelf: ' + (error as Error).message);
         await syncWithDB();
         return;
      }
   };
   const deleteShelf = async (shelfId: number) => {
      const targetShelf = shelves.value.find((shelf) => shelf.id === shelfId);
      if (!targetShelf) {
         alert('Shelf does not exist!');
         return;
      }

      shelves.value = shelves.value.filter((shelf) => shelf.id !== shelfId);
      shiftDisplayOrdersUp(targetShelf.displayOrder);
      try {
         await deleteShelfFromDB(shelfId);
      }
      catch (error) {
         // Rollback UI
         await syncWithDB();
         alert('Failed to delete shelf: ' + (error as Error).message);
      }
   };
   const renameShelf = async (shelfId: number, newName: string) => {
      const targetShelf = shelves.value.find((shelf) => shelf.id === shelfId);
      if (!targetShelf) {
         alert('Shelf does not exist!');
         return;
      }

      const oldName = targetShelf.name;
      // Update UI
      targetShelf.name = newName;
      try {
         await renameShelfInDB(shelfId, newName);
      }
      catch (error) {
         // Rollback UI
         targetShelf.name = oldName;
         alert('Failed to rename shelf: ' + (error as Error).message);
      }
   };
   const collapseShelf = async (shelfId: number) => {
      const targetShelf = shelves.value.find((shelf) => shelf.id === shelfId);
      if (!targetShelf) {
         alert('Shelf does not exist!');
         return;
      }

      const oldState = targetShelf.expanded;
      // Update UI
      targetShelf.expanded = false;
      try {
         await collapseShelfInDB(shelfId);
      }
      catch (error) {
         // Rollback UI
         targetShelf.expanded = oldState;
         alert('Failed to collapse shelf: ' + (error as Error).message);
      }
   };
   const expandShelf = async (shelfId: number) => {
      const targetShelf = shelves.value.find((shelf) => shelf.id === shelfId);
      if (!targetShelf) {
         alert('Shelf does not exist!');
         return;
      }
      const oldState = targetShelf.expanded;
      // Update UI
      targetShelf.expanded = true;
      try {
         await expandShelfInDB(shelfId);
      }
      catch (error) {
         // Rollback UI
         targetShelf.expanded = oldState;
         alert('Failed to expand shelf: ' + (error as Error).message);
      }
   };
   async function moveShelf(shelfId: number, direction: 'up' | 'down') {
      const indexA = shelves.value.findIndex((shelf) => shelf.id === shelfId);
      const targetShelf = shelves.value[indexA];
      if (!targetShelf) {
         alert('Shelf does not exist!');
         return;
      }

      const minDisplayOrder = defaultShelf.displayOrder + 1;
      const maxDisplayOrder = defaultShelf.displayOrder + shelves.value.length;

      const newDisplayOrder = direction === 'up'
         ? targetShelf.displayOrder - 1
         : targetShelf.displayOrder + 1;

      if (
         newDisplayOrder < minDisplayOrder || newDisplayOrder > maxDisplayOrder
      ) {
         alert('Cannot move shelf further in that direction!');
         return;
      }
      const indexB = shelves.value.findIndex(
         (shelf) => shelf.displayOrder === newDisplayOrder,
      );
      const targetToSwap = shelves.value[indexB];
      if (!targetToSwap) {
         alert('Shelf to swap with does not exist!');
         return;
      }

      [targetShelf.displayOrder, targetToSwap.displayOrder] = [
         targetToSwap.displayOrder,
         targetShelf.displayOrder,
      ];

      shelves.value[indexA] = targetToSwap;
      shelves.value[indexB] = targetShelf;

      try {
         await swapShelfDisplayOrdersInDB(targetShelf.id, targetToSwap.id);
      }
      catch (error) {
         await syncWithDB();
         alert('Failed to move shelf: ' + (error as Error).message);
      }
   }
   const moveShelfUp = (shelfId: number) => {
      return moveShelf(shelfId, 'up');
   };
   const moveShelfDown = (shelfId: number) => {
      return moveShelf(shelfId, 'down');
   };

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

export default useShelves;
