<script setup lang="ts">
import { defaultShelf } from '@src/services/dexie/database';
import type { ShelfRecord } from '@src/types/shelf';

const props = defineProps<{
   shelf: ShelfRecord;
}>();

const emit = defineEmits<{
   expand: [shelfId: number];
   collapse: [shelfId: number];
   rename: [shelfId: number];
   delete: [shelfId: number];
   'move-up': [shelfId: number];
   'move-down': [shelfId: number];
}>();
</script>

<template>
   <section class="w-full p-4 md:px-16 xl:px-32 2xl:px-64">
      <header class="flex justify-between py-2">
         <h2 class="font-label text-ink/60 flex w-full items-center font-medium tracking-widest uppercase">
            {{ shelf.name }}
         </h2>

         <ul class="text-ink/50 flex gap-4 text-[80%] lg:gap-6">
            <li :class="{ hidden: shelf.name === defaultShelf.name }">
               <button
                  @click="emit('move-up', shelf.id)"
                  type="button"
                  class="hover:text-highlight transition-colors hover:cursor-pointer"
               >
                  <i class="fa-solid fa-circle-up"></i>
               </button>
            </li>
            <li :class="{ hidden: shelf.name === defaultShelf.name }">
               <button
                  @click="emit('move-down', shelf.id)"
                  type="button"
                  class="hover:text-highlight transition-colors hover:cursor-pointer"
               >
                  <i class="fa-solid fa-circle-down"></i>
               </button>
            </li>
            <li :class="{ hidden: shelf.name === defaultShelf.name }">
               <button
                  @click="emit('rename', shelf.id)"
                  type="button"
                  class="hover:text-highlight transition-colors hover:cursor-pointer"
               >
                  <i class="fa-solid fa-pencil"></i>
               </button>
            </li>
            <li>
               <button
                  @click="
                     if (shelf.expanded) emit('collapse', shelf.id);
                     else emit('expand', shelf.id);
                  "
                  type="button"
                  class="hover:text-highlight transition-colors hover:cursor-pointer"
               >
                  <i v-if="shelf.expanded" class="fa-solid fa-caret-down"></i>
                  <i v-else class="fa-solid fa-caret-right"></i>
               </button>
            </li>
            <li :class="{ hidden: shelf.name === defaultShelf.name }">
               <button
                  @click="emit('delete', shelf.id)"
                  type="button"
                  class="hover:text-highlight transition-colors hover:cursor-pointer"
               >
                  <i class="fa-solid fa-x"></i>
               </button>
            </li>
         </ul>
      </header>

      <slot>
         <!-- ! Books go here -->
      </slot>
   </section>
</template>
