<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Header from '@src/components/reader/Header.vue';
import { useEpubReader } from '@src/composables/reader/useEpubReader';

const route = useRoute();
const router = useRouter();

const params = route.params.bookId as string | undefined;
const bookId = params ? parseInt(params) : NaN;

const reachedBottom = ref<HTMLElement | null>(null);
const { loadedChunks } = useEpubReader(bookId, reachedBottom, () => router.push('/error/book-not-found'));

onUnmounted(() => {
   loadedChunks.value.forEach((chunk) => {
      const urls = chunk.blobUrls;
      if (urls) {
         for (const url of urls) URL.revokeObjectURL(url);
      }
   });
});
</script>

<template>
   <div
      class="bg-bg text-ink min-h-dvh max-w-dvw font-serif text-base leading-normal font-normal transition-colors md:text-xl lg:text-base"
   >
      <Header />

      <div class="px-4 md:px-10">
         <div
            v-for="{ idref, content } in loadedChunks"
            :key="idref"
            class="content-chunk mb-10 min-h-[50vh] border-b border-gray-300 pb-10"
         >
            <div v-html="content"></div>
         </div>
      </div>
      <div ref="reachedBottom" class="flex h-16 w-full items-center justify-center"></div>
   </div>
</template>

<style scoped>
.content-chunk {
   content-visibility: auto;
   contain-intrinsic-size: 0 800px;
}
</style>
