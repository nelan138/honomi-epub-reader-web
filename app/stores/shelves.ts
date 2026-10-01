import { defineStore } from 'pinia';
import { defaultShelf } from '~/services/dexie/database';
import {
   addShelfToDB,
   deleteShelfFromDB,
   getShelvesFromDB,
   renameShelfInDB,
   swapShelfDisplayOrdersInDB,
} from '~/services/dexie/shelfRepo';
import { NotFoundError, RuntimeError } from '~/types/errors';

export const useShelvesStore = defineStore('shelves', {
   state: () => ({
      shelves: [] as ShelfRecord[], // ! always sorted by displayOrder

      isLoading: false,
      isLoaded: false,
   }),

   actions: {
      async syncWithDB() {
         const [data, error] = await tryCatch(getShelvesFromDB());
         if (error) throw error;

         data.sort((a, b) => a.displayOrder - b.displayOrder);
         this.shelves = data;
      },

      async load() {
         if (this.isLoading || this.isLoaded) return;

         this.isLoading = true;

         const [, error] = await tryCatch(this.syncWithDB());
         if (error) {
            this.isLoading = false;
            this.isLoaded = false;
            throw new RuntimeError('Failed to fetch shelves', { cause: error });
         }

         this.isLoading = false;
         this.isLoaded = true;
      },

      // * add new shelf with display order of (last shelf's display order + 1)
      async add(name: string) {
         // display orders starts from 1
         const nextDisplayOrder = (this.shelves.at(-1)?.displayOrder ?? 0) + 1;

         const [result, error] = await tryCatch(
            addShelfToDB({
               name,
               displayOrder: nextDisplayOrder,
            })
         );

         if (error) {
            await this.syncWithDB();
            throw error;
         }

         this.shelves.push({
            id: result.id,
            name,
            displayOrder: nextDisplayOrder,
         });
      },

      //*  delete & normalize display orders afterwards (e.g. 1->2->3->4->5 becomes 1->2->3->4 if shelf 2 is deleted)
      async delete(shelfId: number) {
         // UI first
         const targetShelf = this.shelves.find((shelf) => shelf.id === shelfId);
         if (!targetShelf) throw new NotFoundError('Shelf does not exist!');

         this.shelves = this.shelves.filter((shelf) => shelf.id !== shelfId);
         this.shelves.forEach((shelf) => {
            if (shelf.displayOrder >= targetShelf.displayOrder) shelf.displayOrder -= 1;
         });

         // Sync
         const [_, error] = await tryCatch(deleteShelfFromDB(shelfId));
         if (error) {
            await this.syncWithDB();
            throw error;
         }
      },

      async rename(shelfId: number, newName: string) {
         // UI first
         const targetShelf = this.shelves.find((shelf) => shelf.id === shelfId);

         if (!targetShelf) throw new NotFoundError('Shelf does not exist!');

         targetShelf.name = newName;

         // Sync
         const [_, error] = await tryCatch(renameShelfInDB(shelfId, newName));
         if (error) {
            await this.syncWithDB();
            throw error;
         }
      },

      async move(shelfId: number, direction: 'up' | 'down') {
         // UI first
         const indexOfTargetShelf = this.shelves.findIndex((shelf) => shelf.id === shelfId);
         const targetShelf = this.shelves[indexOfTargetShelf];
         if (!targetShelf) throw new NotFoundError('Shelf does not exist!');

         const minDisplayOrder = defaultShelf.displayOrder + 1;
         const maxDisplayOrder = defaultShelf.displayOrder + this.shelves.length - 1;

         const newDisplayOrder = direction === 'up' ? targetShelf.displayOrder - 1 : targetShelf.displayOrder + 1;

         if (newDisplayOrder < minDisplayOrder || newDisplayOrder > maxDisplayOrder)
            throw new RuntimeError('Shelf is already at the boundary and cannot be moved further.');

         const indexOfShelfToSwap = this.shelves.findIndex((shelf) => shelf.displayOrder === newDisplayOrder);

         const shelfToSwap = this.shelves[indexOfShelfToSwap];
         if (!shelfToSwap) throw new NotFoundError('Shelf to swap does not exist!');

         [targetShelf.displayOrder, shelfToSwap.displayOrder] = [shelfToSwap.displayOrder, targetShelf.displayOrder];

         this.shelves[indexOfTargetShelf] = shelfToSwap;
         this.shelves[indexOfShelfToSwap] = targetShelf;

         const [_, error] = await tryCatch(swapShelfDisplayOrdersInDB(targetShelf.id, shelfToSwap.id));

         if (error) {
            await this.syncWithDB();
            throw error;
         }
      },
   },
});
