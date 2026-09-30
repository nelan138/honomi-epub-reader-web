<template>
   <div>
      <BookShelf
         v-for="shelf in shelvesStore.shelves"
         :id="shelf.id"
         :key="shelf.id"
         :name="shelf.name"
      >
         <BookCard
            v-for="book in booksStore.books.filter(
               (book) => book.shelfId === shelf.id,
            )"
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
   layout: "default",
});

const toast = useToast();
const shelvesStore = useShelvesStore();
const booksStore = useBooksStore();

/* *** */

onMounted(async () => {
   const [_, error] = await tryCatch(shelvesStore.load());
   if (error) {
      toast.add({
         title: "Failed to load shelves",
         description: error.message,
         color: "error",
      });
   }
});

onMounted(async () => {
   const [_, error] = await tryCatch(booksStore.load());
   if (error) {
      toast.add({
         title: "Failed to load books",
         description: error.message,
         color: "error",
      });
   }
});

onUnmounted(() => {
   shelvesStore.$reset();
   booksStore.$reset();
});
</script>
