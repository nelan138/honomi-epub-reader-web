<script setup lang="ts">
import { useReader } from '@src/composables/reader/useReader';
import BookChapter from './BookChapter.vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const params = route.params.bookId as string | undefined;
const bookId = params ? parseInt(params) : NaN;

const { chapters, isLoading } = useReader(bookId);
console.log(`found ${chapters.value.length} chapters`);

</script>

<template>
   <div v-if="isLoading" class="flex min-h-screen items-center justify-center">
      <p>Loading your book...</p>
   </div>
   <main class="p-4">
      <template v-for="chapter in chapters" :key="chapter.idref">
         <BookChapter :content="chapter.content" />
      </template>
   </main>
</template>

<style scoped></style>
