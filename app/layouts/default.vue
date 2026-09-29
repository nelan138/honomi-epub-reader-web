<template>
   <div>
      <UHeader :toggle="false">
         <template #left>
            <UButton
               variant="outline"
               color="primary"
               icon="lucide:file-up"
               @click="triggerFileInput"
            />

            <input
               ref="fileInput"
               hidden
               multiple
               type="file"
               accept=".epub, application/epub+zip"
               @change="
                  (event) => {
                     const target = event.target as HTMLInputElement;
                     handleAddingNewBooks(target.files);
                  }
               "
            >

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
const booksStore = useBooksStore();
const toast = useToast();

/* *** */

onMounted(() => {
   shelvesStore.load();
   booksStore.load();
});

const fileInput = ref<HTMLInputElement | null>(null);

function triggerFileInput() {
   fileInput.value?.click();
}

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

async function handleAddingNewBooks(files: FileList | null | undefined) {
   if (!files || files.length === 0) return;

   for (const file of Array.from(files)) {
      const [_, error] = await tryCatch(booksStore.add(file));
      if (error) {
         toast.add({
            title: `Failed to add ${file.name}`,
            description: error.message,
            color: "error",
         });
         continue;
      }
   }
}
</script>
