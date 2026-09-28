<template>
   <div>
      <UHeader :toggle="false">
         <template #left>
            <UButton variant="outline" color="primary" icon="lucide:file-up" />

            <UButton
               to="https://github.com/nelan138/honomi-epub-reader-web"
               target="_blank"
               variant="link"
               color="neutral"
               icon="lucide:github"
            />
         </template>

         <template #right>
            <UButton
               variant="ghost"
               color="neutral"
               icon="lucide:folder-plus"
               @click="handleAddingNewShelf"
            />
            <UColorModeButton color="secondary" />
         </template>
      </UHeader>

      <UMain>
         <UContainer>
            <slot />
         </UContainer>
      </UMain>

      <UFooter />
   </div>
</template>

<script setup lang="ts">
const inputModal = useInputModal();
const shelvesStore = useShelvesStore();

onMounted(() => {
   shelvesStore.load();
});

const toast = useToast();

async function handleAddingNewShelf() {
   const shelfName = await inputModal.open({
      title: "New Shelf",
      description: "Name must be unique and cannot be empty",
   });

   if (shelfName === null) return;

   if (shelvesStore.shelves.find((shelf) => shelf.name === shelfName)) {
      toast.add({
         title: "Failed",
         description: "Shelf with this name already exists",
         color: "error",
      });
      return;
   }

   shelvesStore.add(shelfName);
}
</script>
