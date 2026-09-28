import { defineStore } from "pinia";
import type { ShelfRecord } from "~/services/dexie/database";
import { addShelfToDB, deleteShelfFromDB, getShelvesFromDB, renameShelfInDB } from "~/services/dexie/shelfRepo";
import { NotFoundError } from "~/types/errors";

export const useShelvesStore = defineStore("shelves", {
   state: () => ({
      shelves: [] as ShelfRecord[], // ! always sorted by displayOrder
      isLoading: false,
      isLoaded: false,
   }),

   // getters: {},

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

         try {
            await this.syncWithDB();
            this.isLoaded = true;
         } finally {
            this.isLoading = false;
         }
      },

      // * add new shelf with display order of (last shelf's display order + 1)
      async add(name: string) {
         // display orders starts from 1
         const nextDisplayOrder = (this.shelves.at(-1)?.displayOrder ?? 0) + 1;

         const [result, error] = await tryCatch(
            addShelfToDB({
               name,
               displayOrder: nextDisplayOrder,
            }),
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
         if (!targetShelf) throw new NotFoundError("Shelf does not exist!");

         this.shelves = this.shelves.filter((shelf) => shelf.id !== shelfId);
         this.shelves.forEach((shelf) => {
            if (shelf.displayOrder >= targetShelf.displayOrder)
               shelf.displayOrder -= 1;
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

         if (!targetShelf) throw new NotFoundError("Shelf does not exist!");

         targetShelf.name = newName;

         // Sync
         const [_, error] = await tryCatch(renameShelfInDB(shelfId, newName));
         if (error) {
            await this.syncWithDB();
            throw error;
         }
      },
   },
});
