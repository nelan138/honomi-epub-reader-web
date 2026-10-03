<template>
   <article
      class="grid bg-default gap-4 w-full grid-cols-[1fr_2fr] rounded-md border-muted border p-2 shadow-sm md:p-4"
      @click="navigateTo(`/reader/book-${id}`)"
   >
      <NuxtImg
         class="my-auto aspect-2/3 h-full"
         :alt="`Book cover for ${meta.title}`"
         :src="cover || '/img/default-book-cover.jpeg'"
         densities="1x 2x"
      />

      <div class="w-full overflow-hidden flex flex-col gap-4">
         <div class="flex min-w-0 flex-1 flex-col">
            <h3 class="text-base text-default font-serif font-medium line-clamp-2 break-all">
               {{ meta.title }}
            </h3>

            <div class="pt-1 text-xs text-muted font-sans flex flex-col gap-2 lg:gap-1">
               <p class="truncate">{{ meta.creator }}</p>
               <p class="truncate">{{ meta.publisher }}</p>
               <p class="truncate">{{ meta.language }}</p>
            </div>
         </div>

         <USlider
            disabled
            :model-value="progress"
            :min="0"
            :max="100"
            color="success"
            class="cursor-default"
            :ui="{
               track: 'h-px',
               thumb: 'h-2 w-2 ring-0 bg-inverted',
            }"
         />

         <UFieldGroup
            orientation="horizontal"
            class="flex justify-end gap-4 md:gap-8 lg:justify-around lg:gap-2"
            @click.stop
         >
            <UButton variant="link" color="neutral" icon="lucide:pen-line" @click="handleRenamingBook" />

            <UButton variant="link" color="neutral" icon="lucide:arrow-left-right" @click="handleChangingBookShelf" />

            <UButton
               variant="link"
               color="neutral"
               icon="lucide:trash"
               class="hover:text-error"
               @click="handleDeletingBook"
            />
         </UFieldGroup>
      </div>
   </article>
</template>

<script lang="ts" setup>
const inputModal = useInputModal();
const alertModal = useAlertModal();
const listModal = useListModal();
const booksStore = useBooksStore();
const shelvesStore = useShelvesStore();
const toast = useToast();

/* *** */

onUnmounted(() => {
   if (cover && cover.startsWith('blob:')) URL.revokeObjectURL(cover);
});

/* *** */

const {
   id,
   cover = undefined,
   meta = {
      title: 'No title',
      creator: 'Unknown',
      publisher: 'Unknown',
      language: undefined,
   },
   progress = 0,
} = defineProps<{
   id: number;
   cover?: string;
   meta?: {
      title?: string;
      creator?: string;
      publisher?: string;
      language?: string;
   };
   progress?: number;
}>();

async function handleRenamingBook() {
   const newName = await inputModal.open({
      title: 'Rename book',
      description: 'Enter a new name for the book',
   });

   if (!newName) return;

   const [, e] = await tryCatch(booksStore.rename(id, newName));
   if (e) {
      toast.add({
         title: 'Error renaming book',
         description: e.message,
         color: 'error',
      });
   }
}

async function handleDeletingBook() {
   const confirmed = await alertModal.open({
      title: 'Delete book',
      description: 'Are you sure you want to delete this book?',
   });

   if (!confirmed) return;
   const [, e] = await tryCatch(booksStore.delete(id));
   if (e) {
      toast.add({
         title: 'Error deleting book',
         description: e.message,
         color: 'error',
      });
   }
}

async function handleChangingBookShelf() {
   const selectedShelf = await listModal.open({
      title: 'Change book shelf',
      description: 'Select a new shelf for the book',
      items: shelvesStore.shelves.map((shelf) => {
         return {
            label: shelf.name,
            id: shelf.id,
         };
      }),
   });

   if (!selectedShelf) return;

   const [, e] = await tryCatch(booksStore.changeShelf(id, selectedShelf.id));
   if (e) {
      toast.add({
         title: 'Error changing book shelf',
         description: e.message,
         color: 'error',
      });
   }
}
</script>
