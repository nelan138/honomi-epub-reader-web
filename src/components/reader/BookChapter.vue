<script lang="ts" setup>
const props = defineProps<{
   // HTML string
   content: string;
}>();
</script>

<template>
   <article
      class="prose prose-headings:text-ink text-ink w-full max-w-full [content-visibility:auto] [&_img]:mx-auto [&_img]:block [&_img]:max-h-[80dvh] [&_img]:max-w-[80dvw]"
      v-html="content"
   ></article>
</template>

<style scoped></style>
