<script setup lang="ts">
import type { CategoryRecord } from '@src/types/category';
import { defaultCategory } from '@src/constants/database';

const props = defineProps<{
   category: CategoryRecord;
}>();

const emit = defineEmits<{
   expand: [id: number];
   collapse: [id: number];
   rename: [id: number];
   delete: [id: number];
}>();
</script>

<template>
   <section class="w-full p-4 md:px-16 xl:px-32 2xl:px-64">
      <header class="flex justify-between py-2">
         <h2 class="font-label text-ink/60 flex w-full items-center font-medium tracking-widest uppercase">
            {{ category.name }}
         </h2>

         <ul class="text-ink/50 flex gap-4 text-[80%] lg:gap-6">
            <li :class="{ hidden: category.name === defaultCategory.name }">
               <!-- Todo: Move up -->
               <button type="button" class="hover:text-highlight transition-colors hover:cursor-pointer">
                  <i class="fa-solid fa-circle-up"></i>
               </button>
            </li>
            <li :class="{ hidden: category.name === defaultCategory.name }">
               <!-- Todo: Move down -->
               <button type="button" class="hover:text-highlight transition-colors hover:cursor-pointer">
                  <i class="fa-solid fa-circle-down"></i>
               </button>
            </li>
            <li :class="{ hidden: category.name === defaultCategory.name }">
               <button
                  @click="() => emit('rename', category.id)"
                  type="button"
                  class="hover:text-highlight transition-colors hover:cursor-pointer"
               >
                  <i class="fa-solid fa-pencil"></i>
               </button>
            </li>
            <li>
               <button
                  @click="
                     () => {
                        if (category.expanded) emit('collapse', category.id);
                        else emit('expand', category.id);
                     }
                  "
                  type="button"
                  class="hover:text-highlight transition-colors hover:cursor-pointer"
               >
                  <i v-if="category.expanded" class="fa-solid fa-caret-down"></i>
                  <i v-else class="fa-solid fa-caret-right"></i>
               </button>
            </li>
            <li :class="{ hidden: category.name === defaultCategory.name }">
               <button
                  @click="() => emit('delete', category.id)"
                  type="button"
                  class="hover:text-highlight transition-colors hover:cursor-pointer"
               >
                  <i class="fa-solid fa-x"></i>
               </button>
            </li>
         </ul>
      </header>

      <div class="grid w-full grid-cols-1 gap-4 lg:grid-cols-3 2xl:grid-cols-4">
         <slot>
            <!-- ! Books go here -->
         </slot>
      </div>
   </section>
</template>
