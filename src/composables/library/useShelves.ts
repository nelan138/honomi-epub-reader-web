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
} from '@src/services/dexie/shelfRepo';
import { defaultShelf } from '@src/services/dexie/database';

function useShelves() {
   const shelves = ref<UIShelf[]>([]);
   onMounted(async () => await syncWithDB());

   async function syncWithDB() {
      shelves.value = await getShelvesFromDB();
      shelves.value.sort((a, b) => a.displayOrder - b.displayOrder);
   }

   function shiftDisplayOrdersUp(startFrom: number) {
      shelves.value.forEach((shelf) => {
         if (shelf.displayOrder >= startFrom) shelf.displayOrder -= 1;
      });
   }

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
      }
   };

   const deleteShelf = async (shelfId: number) => {
      const targetShelf = shelves.value.find((shelf) => shelf.id === shelfId);
      if (!targetShelf) return alert('Shelf does not exist!');

      shelves.value = shelves.value.filter((shelf) => shelf.id !== shelfId);
      shiftDisplayOrdersUp(targetShelf.displayOrder);

      try {
         await deleteShelfFromDB(shelfId);
      }
      catch (error) {
         await syncWithDB();
         alert('Failed to delete shelf: ' + (error as Error).message);
      }
   };

   const renameShelf = async (shelfId: number, newName: string) => {
      const targetShelf = shelves.value.find((shelf) => shelf.id === shelfId);
      if (!targetShelf) return alert('Shelf does not exist!');

      targetShelf.name = newName;
      try {
         await renameShelfInDB(shelfId, newName);
      }
      catch (error) {
         await syncWithDB();
         alert('Failed to rename shelf: ' + (error as Error).message);
      }
   };

   const collapseShelf = async (shelfId: number) => {
      const targetShelf = shelves.value.find((shelf) => shelf.id === shelfId);
      if (!targetShelf) return alert('Shelf does not exist!');

      targetShelf.expanded = false;
      try {
         await collapseShelfInDB(shelfId);
      }
      catch (error) {
         await syncWithDB();
         alert('Failed to collapse shelf: ' + (error as Error).message);
      }
   };
   const expandShelf = async (shelfId: number) => {
      const targetShelf = shelves.value.find((shelf) => shelf.id === shelfId);
      if (!targetShelf) return alert('Shelf does not exist!');

      targetShelf.expanded = true;
      try {
         await expandShelfInDB(shelfId);
      }
      catch (error) {
         await syncWithDB();
         alert('Failed to expand shelf: ' + (error as Error).message);
      }
   };
   async function moveShelf(shelfId: number, direction: 'up' | 'down') {
      const indexOfTargetShelf = shelves.value.findIndex((shelf) =>
         shelf.id === shelfId
      );
      const targetShelf = shelves.value[indexOfTargetShelf];
      if (!targetShelf) return alert('Shelf does not exist!');

      const minDisplayOrder = defaultShelf.displayOrder + 1;
      const maxDisplayOrder = defaultShelf.displayOrder + shelves.value.length;

      const newDisplayOrder = direction === 'up'
         ? targetShelf.displayOrder - 1
         : targetShelf.displayOrder + 1;

      if (
         newDisplayOrder < minDisplayOrder
         || newDisplayOrder > maxDisplayOrder
      ) { return alert('Cannot move shelf further in that direction!'); }

      const indexOfShelfToSwap = shelves.value.findIndex(
         (shelf) => shelf.displayOrder === newDisplayOrder,
      );

      const shelfToSwap = shelves.value[indexOfShelfToSwap];
      if (!shelfToSwap) return alert('Shelf to swap with does not exist!');

      [targetShelf.displayOrder, shelfToSwap.displayOrder] = [
         shelfToSwap.displayOrder,
         targetShelf.displayOrder,
      ];

      shelves.value[indexOfTargetShelf] = shelfToSwap;
      shelves.value[indexOfShelfToSwap] = targetShelf;

      try {
         await swapShelfDisplayOrdersInDB(targetShelf.id, shelfToSwap.id);
      }
      catch (error) {
         await syncWithDB();
         alert('Failed to move shelf: ' + (error as Error).message);
      }
   }
   const moveShelfUp = async (shelfId: number) => {
      return await moveShelf(shelfId, 'up');
   };
   const moveShelfDown = async (shelfId: number) => {
      return await moveShelf(shelfId, 'down');
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
