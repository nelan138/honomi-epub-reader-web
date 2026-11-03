<!-- eslint-disable vue/no-v-html -->
<template>
   <section
      class="prose max-w-none prose-p:m-0 prose-p:text-default prose-headings:text-default prose-a:text-default [&_img]:block [&_img]:max-h-[80dvh] [&_img]:max-w-[80dvw] [&_img]:mx-auto"
      :class="[
         `prose-${settingsStore.fontSize}`,
         `prose-p:leading-${settingsStore.fontLeading}`,
         `prose-p:tracking-${settingsStore.fontTracking}`,
         `[font-kerning:${settingsStore.fontKerning}]`,
         `px-${settingsStore.bookPadding}`,
         'prose-p:[font-family:var(--paragraph-font)]',
         'prose-headings:[font-family:var(--heading-font)]',

         {
            'w-full': settingsStore.writingMode === 'horizontal',
            'h-full [&_img]:my-[10vw]': settingsStore.writingMode === 'vertical',
            '[&_rt]:invisible': settingsStore.furiganaDisplay === 'none',
            '[&_rt]:invisible [&_ruby:hover>rt]:visible': settingsStore.furiganaDisplay === 'hover',
         },
      ]"
      :style="{
         '--paragraph-font': settingsStore.paragraphFont,
         '--heading-font': settingsStore.headingFont,
      }"
      v-html="content"
   />
</template>

<script lang="ts" setup>
const settingsStore = useSettingsStore();

const { content } = defineProps<{
   content: string;
}>();
</script>
