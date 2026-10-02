<template>
   <div class="pb-12">
      <BookShelf v-for="shelf in shelvesStore.shelves" :id="shelf.id" :key="shelf.id" :name="shelf.name">
         <BookCard
            v-for="book in booksStore.books.filter((book) => book.shelfId === shelf.id)"
            :id="book.id"
            :key="book.id"
            :cover="book.cover ? createBlobUrl(book.cover) : undefined"
            :meta="book.metadata"
            :progress="(book.charactersRead * 100) / book.totalCharacters"
         />
      </BookShelf>
   </div>
</template>

<script setup lang="ts">

definePageMeta({
   layout: 'library',
});

const toast = useToast();
const shelvesStore = useShelvesStore();
const booksStore = useBooksStore();

/* *** */

onMounted(async () => {
   const [, error1] = await tryCatch(shelvesStore.load());
   const [, error2] = await tryCatch(booksStore.load());

   if (error1 || error2) {
      toast.add({
         title: 'Failed to load from database',
         description: error1?.message ?? '' + error2?.message,
         color: 'error',
      });

      return;
   }
});

onUnmounted(() => {
   shelvesStore.$reset();
   booksStore.$reset();
});
</script>
