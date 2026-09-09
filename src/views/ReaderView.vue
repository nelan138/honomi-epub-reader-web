<script setup lang="ts">
import BookChapter from '@src/components/reader/BookChapter.vue';
import ReaderHeader from '@src/components/reader/ReaderHeader.vue';
import { type Chapter, useReader } from '@src/composables/reader/useReader';
import { navigateToNotFoundPage, unwrapAsync } from '@src/utilities';
import { onMounted, onUnmounted, shallowRef } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const chapters = shallowRef<Chapter[]>([]);
const progress = '67.67';

onMounted(async () => {
   const params = route.params.bookId as string | undefined;
   const bookId = params ? parseInt(params) : NaN;

   const { getChapters } = useReader();

   const [data, error] = await unwrapAsync(getChapters(bookId));
   if (error || !data) {
      navigateToNotFoundPage();
      return;
   }

   chapters.value = data;
});

onUnmounted(() => {
   for (const chapter of chapters.value) {
      if (chapter.blobUrls) chapter.blobUrls.forEach((url) => URL.revokeObjectURL(url));
   }
});
</script>

<template>
   <ReaderHeader />
   <template v-if="chapters.length === 0">
      <main class="h-screen w-full p-8 text-center">Loading...</main>
   </template>

   <template v-else>
      <main class="scrollbar-thin p-4">
         <template v-for="chapter in chapters" :key="chapter.idref">
            <BookChapter :content="chapter.content" />
         </template>

         <footer class="sticky bottom-0 z-50 py-2 text-right text-xs">{{ progress }} %</footer>
      </main>
   </template>
</template>

<style scoped></style>
