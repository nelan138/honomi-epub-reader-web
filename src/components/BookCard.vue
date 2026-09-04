<script setup lang="ts">
import type { UIBookCard } from '@src/types/book';

const props = defineProps<{
   book: UIBookCard;
}>();

const emit = defineEmits<{
   rename: [bookId: number];
   changeShelf: [bookId: number];
   delete: [bookId: number];
}>();

const defaultCover = '../assets/default-book-cover.jpeg';
const coverUrl = props.book.cover ? URL.createObjectURL(props.book.cover) : new URL(defaultCover, import.meta.url).href;

function cleanUpCoverUrl() {
   URL.revokeObjectURL(coverUrl);
}
</script>

<template>
   <article
      class="bg-card border-stroke/20 hover:border-highlight/50 grid min-w-0 grid-cols-[1fr_2fr] rounded-md border p-2 shadow-sm transition-colors md:p-4"
   >
      <div class="border-stroke/15 flex aspect-2/3 h-full items-center overflow-hidden rounded-sm border">
         <img class="h-full w-full object-cover" :src="coverUrl" @load="cleanUpCoverUrl" @error="cleanUpCoverUrl" />
      </div>

      <div class="bg-card flex flex-col gap-4 pl-4">
         <div class="flex flex-1 flex-col md:gap-2 md:text-[100%]">
            <h3 class="font-label line-clamp-2 font-medium">{{ book.metadata?.title ?? 'No title' }}</h3>
            <p class="text-muted line-clamp-1 text-[80%]">{{ book.metadata?.creator ?? 'Unknown' }}</p>
            <p class="text-muted line-clamp-1 text-[80%] uppercase">{{ book.metadata?.language ?? '' }}</p>
         </div>

         <!-- Todo: Progress bar -->
         <div class="bg-stroke/10 h-1 overflow-hidden rounded-full">
            <div class="bg-tertiary h-full w-[67%] rounded-full"></div>
         </div>

         <ul class="text-ink/60 flex justify-end gap-4 md:gap-8 lg:justify-around lg:gap-2">
            <li>
               <button
                  @click="() => emit('rename', book.id)"
                  type="button"
                  class="hover:text-highlight aspect-square transition-colors hover:cursor-pointer"
               >
                  <i class="fa-solid fa-pen-to-square"></i>
               </button>
            </li>

            <li>
               <button
                  @click="() => emit('changeShelf', book.id)"
                  type="button"
                  class="hover:text-highlight aspect-square transition-colors hover:cursor-pointer"
               >
                  <i class="fa-solid fa-right-left"></i>
               </button>
            </li>

            <li>
               <button
                  @click="() => emit('delete', book.id)"
                  type="button"
                  class="aspect-square transition-colors hover:cursor-pointer hover:text-red-400"
               >
                  <i class="fa-solid fa-trash"></i>
               </button>
            </li>
         </ul>
      </div>
   </article>
</template>
