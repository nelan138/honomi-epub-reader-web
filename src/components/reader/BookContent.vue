<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useDebounceFn } from '@vueuse/core';
import { useReader } from '@src/composables/reader/useReader';
import BookChapter from './BookChapter.vue';
import { getBookFromDB, updateBookProgressInDB } from '@src/services/dexie/bookRepo.js';

const route = useRoute();
const params = route.params.bookId as string | undefined;
const bookId = params ? parseInt(params) : NaN;

const { chapters, cumulativeCharacterCountMap, totalCharacterCount } = useReader(bookId);

const currentCharacterCount = ref(0);
const progressPercentage = ref(0.0);

const handleScroll = useDebounceFn(async () => {
   const x = window.innerWidth / 2;
   const y = 80;

   const target = document.elementFromPoint(x, y);
   const paragraph = target?.closest('[data-index]');

   if (!paragraph) return;

   const currentIndex = Number(paragraph.getAttribute('data-index'));
   const charsRead = cumulativeCharacterCountMap.get(currentIndex) ?? 0;

   currentCharacterCount.value = charsRead;
   progressPercentage.value = totalCharacterCount.value > 0 ? (charsRead / totalCharacterCount.value) * 100 : 0.0;

   await updateBookProgressInDB(bookId, progressPercentage.value);
}, 250);

import { nextTick } from 'vue';
import { navigateToNotFoundPage } from '@src/utilities.js';

async function restoreScrollPosition(savedPercentage: number) {
   const targetChars = (savedPercentage / 100) * totalCharacterCount.value;

   let targetIndex = 0;
   for (const [index, chars] of cumulativeCharacterCountMap.entries()) {
      if (chars >= targetChars) {
         targetIndex = index;
         break;
      }
   }

   await nextTick();
   const targetElement = document.querySelector(`[data-index="${targetIndex}"]`);
   targetElement?.scrollIntoView({ behavior: 'auto', block: 'start' });
}

onMounted(async () => {
   window.addEventListener('scroll', handleScroll, { passive: true });
   const bookCard = await getBookFromDB(bookId).catch(navigateToNotFoundPage);
   if (!bookCard) return navigateToNotFoundPage();

   currentCharacterCount.value = Math.floor((bookCard.progress / 100) * totalCharacterCount.value);
   progressPercentage.value = bookCard.progress;
   restoreScrollPosition(bookCard.progress);
});

onUnmounted(() => {
   window.removeEventListener('scroll', handleScroll);
});
</script>

<template>
   <main class="scrollbar-thin p-4">
      <template v-for="chapter in chapters" :key="chapter.idref">
         <BookChapter :content="chapter.content" />
      </template>

      <footer class="sticky bottom-0 z-50 py-2 text-right text-xs">
         {{ currentCharacterCount }} / {{ totalCharacterCount }} ({{ progressPercentage.toFixed(2) }}%)
      </footer>
   </main>
</template>

<style scoped></style>
