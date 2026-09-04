<script setup lang="ts">
import { getBooksFromDB } from '@src/services/dexie/bookRepo';
import type { BookRecord } from '@src/types/book';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const books = ref<BookRecord[]>([]);
const route = useRoute();
const router = useRouter();

onMounted(async () => {
   books.value = await getBooksFromDB();

   const bookId = route.params.bookId as string | undefined;
   const parsedId = bookId ? parseInt(bookId) : NaN;

   if (Number.isNaN(parsedId) || !books.value.some((book) => book.id === parsedId)) {
      router.replace('/book-not-found');
   }
});

</script>

<template>
   <div class="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <h1>Reader View</h1>
      <p>It works i guess.</p>
   </div>
</template>

<style scoped></style>
