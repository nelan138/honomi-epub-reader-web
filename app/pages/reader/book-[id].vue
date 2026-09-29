<!-- eslint-disable vue/no-v-html -->
<template>
   <div>
      <article
         class="w-full [&_img,&_svg]:mx-auto [&_img,&_svg]:block [&_img,&_svg]:max-h-[80dvh] [&_img,&_svg]:max-w-[80dvw]"
      >
         <section
            v-for="section in readerStore.sections"
            :key="section.idref"
            v-html="section.content"
         />
      </article>
   </div>
</template>

<script setup lang="ts">
const readerStore = useReaderStore();

const route = useRoute();

const bookId = Number(route.params.id);
const blobUrls = [] as string[];

onMounted(async () => {
   await readerStore.load(bookId);

   readerStore.processAnchorInternalLinks();

   const result = readerStore.loadImages();
   blobUrls.push(...result);
});

onUnmounted(() => {
   console.log('[Reader] Unmounting, cleaning up blob URLs:', blobUrls.length);
   blobUrls.forEach((url) => {
      URL.revokeObjectURL(url);
   });

   readerStore.$reset();
});
</script>

<style scoped></style>
