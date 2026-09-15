<script setup lang="ts">
import { useReader } from '@src/composables/reader/useReader';
import { navigateToNotFoundPage, unwrapAsync } from '@src/utilities';

import type { Section } from '@src/services/epub/epubParser';

const route = useRoute();
const params = route.params.bookId as string | undefined;
const bookId = params ? parseInt(params) : NaN;

const { getChapters } = useReader();

const chapters = shallowRef<Section[]>([]);

onMounted(async () => {
   const [data, error] = await unwrapAsync(getChapters(bookId));
   if (!data) {
      console.warn(error.message);
      navigateToNotFoundPage();
      return;
   }
   chapters.value = data;
});
</script>

<template>
   <ReaderHeader />
   <div v-if="chapters.length === 0" class="my-auto w-full p-8 text-center">Loading...</div>
   <div v-else class="scrollbar-thin p-4 font-sans">
      <ul>
         <li v-for="chapter in chapters" :key="chapter.idref">
            <BookChapter :content="chapter.content" />
         </li>
      </ul>

      <footer class="sticky bottom-0 z-50 py-2 text-right text-xs">
         <span> 67/76 - </span>
         <span> 67% </span>
      </footer>
   </div>
</template>

<style scoped></style>
