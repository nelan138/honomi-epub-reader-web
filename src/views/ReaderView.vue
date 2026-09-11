<script setup lang="ts">
import BookChapter from '@src/components/reader/BookChapter.vue';
import ReaderHeader from '@src/components/reader/ReaderHeader.vue';
import { type Chapter, useReader } from '@src/composables/reader/useReader';
import { cleanUpBlobUrls, navigateToNotFoundPage, unwrapAsync } from '@src/utilities';
import { computed, onMounted, onUnmounted, shallowRef } from 'vue';
import { useRoute } from 'vue-router';

import { getBookFromDB, updateBookProgressInDB } from '@src/services/dexie/bookRepo';
import { useBookScroller } from '@src/composables/reader/useBookScroller';
import { useDebounceFn } from '@vueuse/core';

const route = useRoute();
const params = route.params.bookId as string | undefined;
const bookId = params ? parseInt(params) : NaN;

const { getChapters } = useReader();
const { restoreScrollPosition, getCurrentPIndex } = useBookScroller();

const chapters = shallowRef<Chapter[]>([]);

const totalCharacterCount = shallowRef<number>(0);
const scrolledPastCharacterCount = shallowRef<number>(0);

// Uniform all maps into one map
const cumulativeCharacterCount = computed(() => {
   const map = new Map<number, number>();
   let runningTotal = 0;

   for (const chapter of chapters.value) {
      for (const [pIndex, charCount] of chapter.characterCount.entries()) {
         runningTotal += charCount;
         map.set(pIndex, runningTotal);
      }
   }

   return map;
});

const delay = 1000; // delay on scroll stop (ms)
const updateBookProgressOnScrollStop = useDebounceFn(async () => {
   const pIndex = getCurrentPIndex();
   if (!pIndex) return;

   const readCharCount = cumulativeCharacterCount.value.get(pIndex);
   if (!readCharCount) return;

   const [error] = await unwrapAsync(updateBookProgressInDB(bookId, readCharCount));
   if (error) return; // ! fails to save progress

   scrolledPastCharacterCount.value = readCharCount;
}, delay);

onMounted(async () => {
   const [data] = await unwrapAsync(getChapters(bookId));
   if (!data) {
      navigateToNotFoundPage();
      return;
   }
   chapters.value = data;

   const [book] = await unwrapAsync(getBookFromDB(bookId));
   if (!book) {
      navigateToNotFoundPage();
      return;
   }

   totalCharacterCount.value = book.totalCharacterCount;
   scrolledPastCharacterCount.value = book.readCharacterCount;

   // Attach func: Runs after `delay` every time user stops scrolling.
   window.addEventListener('scroll', updateBookProgressOnScrollStop, { passive: true });

   restoreScrollPosition(scrolledPastCharacterCount.value, cumulativeCharacterCount.value);
});

onUnmounted(() => {
   window.removeEventListener('scroll', updateBookProgressOnScrollStop);
   chapters.value.forEach((chapter) => cleanUpBlobUrls(chapter.blobUrls));
});

const progressPercentage = computed(() => {
   if (totalCharacterCount.value === 0) return '0.00';
   return ((scrolledPastCharacterCount.value * 100) / totalCharacterCount.value).toFixed(2);
});
</script>

<template>
   <main>
      <ReaderHeader />
      <div v-if="chapters.length === 0" class="my-auto w-full p-8 text-center">Loading...</div>
      <div v-else class="scrollbar-thin p-4 font-sans">
         <ul>
            <li v-for="chapter in chapters" :key="chapter.idref">
               <BookChapter :content="chapter.content" />
            </li>
         </ul>

         <footer class="sticky bottom-0 z-50 py-2 text-right text-xs">
            <span>{{ scrolledPastCharacterCount }}/{{ totalCharacterCount }} - </span>
            <span>{{ progressPercentage }}%</span>
         </footer>
      </div>
   </main>
</template>

<style scoped></style>
