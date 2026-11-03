<template>
   <ReaderScrollArea
      :orientation="settingsStore.writingMode === 'horizontal' ? 'vertical' : 'horizontal'"
      :scroll-speed="settingsStore.scrollSpeed"
   >
      <ReaderSection
         v-for="section in readerStore.sections"
         :key="section.idref"
         :data-reference="section.idref"
         :content="section.content"
      />
   </ReaderScrollArea>
</template>

<script setup lang="ts">
definePageMeta({
   layout: 'reader',
});

const readerStore = useReaderStore();
const settingsStore = useSettingsStore();
const toast = useToast();
const route = useRoute();
const bookId = Number(route.params.id);

/* *** */

onMounted(async () => {
   /**
    * This block runs reader store set-up
    */
   const [, error] = await tryCatch(readerStore.load(bookId));
   if (error) {
      toast.add({
         title: 'Failed to load from database',
         description: error.message,
         color: 'error',
      });

      return;
   }

   readerStore.loadAnchorInternalLinks();

   const urls = readerStore.loadImages();
   blobUrls.push(...urls); // ! to be freed later on unmounted

   /**
    * Guards to ensure the block below runs as expected
    */
   await nextTick(); //  vue update component reactivity
   await nextFrame(); // DOM painting

   /**
    * The block below should run after Vue update all the components depending on readerStore and after the DOM finishes painting
    */
   readerStore.restoreLastSection();
});

const blobUrls = [] as string[];

onUnmounted(() => {
   blobUrls.forEach((url) => URL.revokeObjectURL(url));

   readerStore.$reset();
});
</script>
