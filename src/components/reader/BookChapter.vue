<script lang="ts" setup>
const props = defineProps<{
   /**
    * HTML string
    */
   content: string;
}>();
</script>

<template>
   <article
      class="py-4 prose prose-headings:text-ink text-ink w-full max-w-full [content-visibility:auto] [&_img,&_svg]:mx-auto [&_img,&_svg]:block [&_img,&_svg]:max-h-[80dvh] [&_img,&_svg]:max-w-[80dvw]"
      v-html="content"
   ></article>
</template>

<style scoped></style>
