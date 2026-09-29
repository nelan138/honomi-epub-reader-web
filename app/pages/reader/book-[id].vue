<!-- eslint-disable vue/no-v-html -->
<template>
   <article
      class="w-full [&_img,&_svg]:mx-auto [&_img,&_svg]:block [&_img,&_svg]:max-h-[80dvh] [&_img,&_svg]:max-w-[80dvw]"
   >
      <section
         v-for="section in readerStore.sections"
         :key="section.idref"
         v-html="section.content"
      />
   </article>
</template>

<script setup lang="ts">
const readerStore = useReaderStore();

const route = useRoute();

const bookId = Number(route.params.id);
const blobUrls = [] as string[];

onMounted(async () => {
   await readerStore.load(bookId);
   blobUrls.push(...readerStore.loadImages());
});

onUnmounted(() => {
   blobUrls.forEach((url) => {
      URL.revokeObjectURL(url);
   });
});
</script>

<style scoped></style>
