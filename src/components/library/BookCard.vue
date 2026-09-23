<script setup lang="ts">
import type { BookCard } from '@src/stores/useBookStore';
import { cleanUpBlobUrls } from '@src/utils';
import { ProgressRoot, ProgressIndicator } from 'reka-ui';

/* *** */

const props = defineProps<{
   book: BookCard;
}>();

const emit = defineEmits<{
   rename: [bookId: number];
   changeShelf: [bookId: number];
   delete: [bookId: number];
   open: [bookId: number];
}>();

const coverUrl = URL.createObjectURL(props.book.cover);

onUnmounted(() => cleanUpBlobUrls([coverUrl]));
</script>

<template>
   <article
      @click="emit('open', book.id)"
      class="grid min-w-0 grid-cols-[1fr_2fr] rounded-md border border-(--card-border) bg-(--card) p-2 shadow-sm md:p-4"
   >
      <!-- Cover -->
      <div class="flex aspect-2/3 h-full items-center overflow-hidden rounded-sm border">
         <img class="h-full w-full object-cover" :src="coverUrl" />
      </div>

      <div class="flex flex-col gap-4 pl-4">
         <!-- Metadata -->
         <div class="flex min-w-0 flex-1 flex-col font-serif md:gap-2 md:text-[100%]">
            <h3 class="line-clamp-2 font-sans font-medium break-all">{{ book.metadata.title }}</h3>
            <p class="truncate text-[80%]">{{ book.metadata.creator }}</p>
            <p class="truncate text-[80%]">{{ book.metadata.publisher }}</p>
            <p class="truncate text-[80%] uppercase">{{ book.metadata.language }}</p>
         </div>

         <ProgressRoot
            :model-value="(book.charactersRead * 100) / book.totalCharacters"
            class="relative h-1 w-full overflow-hidden rounded-full bg-(--progress-bar-bg)"
         >
            <ProgressIndicator
               class="h-full w-full bg-(--progress-bar-color)"
               :style="`transform: translateX(-${100 - (book.charactersRead * 100) / book.totalCharacters}%)`"
            />
         </ProgressRoot>

         <!-- Buttons -->
         <ul @click.stop class="flex justify-end gap-4 md:gap-8 lg:justify-around lg:gap-2">
            <li>
               <button @click="emit('rename', book.id)" type="button" class="aspect-square hover:cursor-pointer">
                  <i class="fa-solid fa-pen-to-square"></i>
               </button>
            </li>

            <li>
               <button @click="emit('changeShelf', book.id)" type="button" class="aspect-square hover:cursor-pointer">
                  <i class="fa-solid fa-right-left"></i>
               </button>
            </li>

            <li>
               <button
                  @click="emit('delete', book.id)"
                  type="button"
                  class="aspect-square hover:cursor-pointer hover:text-red-400"
               >
                  <i class="fa-solid fa-trash"></i>
               </button>
            </li>
         </ul>
      </div>
   </article>
</template>

<style scoped>
:global(html) {
   --card: #f6f2e6;
   --card-border: var(--tertiary);
   --progress-bar-bg: #e0e0e0;
   --progress-bar-color: var(--ink);
}

:global(html.dark) {
   --card: #15181a;
   --progress-bar-bg: #3e3e3e;
}
</style>
