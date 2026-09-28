<template>
   <article
      class="grid gap-4 w-full grid-cols-[1fr_2fr] rounded-md border border-(--card-border) bg-(--card) p-2 shadow-sm md:p-4"
   >
      <LazyNuxtImg
         class="my-auto"
         :alt="`Book cover for ${meta.title}`"
         :src="cover || '/img/default-book-cover.jpeg'"
      />

      <div class="w-full overflow-hidden flex h-full flex-col gap-4">
         <div class="flex min-w-0 flex-1 flex-col">
            <h3 class="text-base font-medium line-clamp-2 break-all">
               {{ meta.title }}
            </h3>

            <div class="text-sm">
               <p class="truncate">{{ meta.creator }}</p>
               <p class="truncate">{{ meta.publisher }}</p>
               <p class="truncate">{{ meta.language }}</p>
            </div>
         </div>

         <UProgress
            size="sm"
            color="neutral"
            :model-value="progress"
            :max="100"
         />

         <UFieldGroup
            orientation="horizontal"
            class="flex justify-end gap-4 md:gap-8 lg:justify-around lg:gap-2"
         >
            <UButton variant="soft" color="neutral" icon="lucide:pen-line" @click="handleRenamingBook(id)"/>

            <UButton
               variant="soft"
               color="neutral"
               icon="lucide:arrow-left-right"
            />

            <UButton variant="soft" color="warning" icon="lucide:trash" />
         </UFieldGroup>
      </div>
   </article>
</template>

<script lang="ts" setup>
const inputModal = useInputModal();
const booksStore = useBooksStore();

/* *** */

const {
   id,
   cover = undefined,
   meta = {
      title: "No title",
      creator: "Unknown",
      publisher: "Unknown",
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

async function handleRenamingBook(id: number) {
   const newName = await inputModal.open({
      title: "Rename book",
      description: "Enter a new name for the book",
   });

   if (!newName) return;
   booksStore.rename(id, newName);
}

onUnmounted(() => {
   if (cover && cover.startsWith("blob:")) URL.revokeObjectURL(cover);
});
</script>

<style></style>
