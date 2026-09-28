<template>
   <div>
      <BookShelf
         v-for="shelf in shelvesStore.shelves"
         :id="shelf.id"
         :key="shelf.id"
         :name="shelf.name"
      >
         <BookCard />
      </BookShelf>
   </div>
</template>

<script setup lang="ts">

const toast = useToast();
const shelvesStore = useShelvesStore();

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

onUnmounted(() => {
   shelvesStore.$reset();
});
</script>
