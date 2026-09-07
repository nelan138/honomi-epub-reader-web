<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import Header from '@src/components/reader/Header.vue';
import { useReader } from '@src/composables/reader/useReader';
import { useBottomSentinel } from '@src/composables/reader/useSentinel';

const route = useRoute();
const params = route.params.bookId as string | undefined;
const bookId = params ? parseInt(params) : NaN;

const { loadedChunks, loadNextContentToChunks, isReady: databaseLoaded, publisherStyles } = useReader(bookId);

const sentinel = ref<Element>();
useBottomSentinel(sentinel, loadNextContentToChunks, { executeWhileVisible: true });
</script>

<template>
   <div
      class="bg-bg text-ink min-h-dvh max-w-dvw font-serif text-base leading-normal font-normal transition-colors md:text-xl lg:text-base"
   >
      <Header />

      <main class="p-4 [&_img]:mx-auto [&_img]:block [&_img]:max-h-dvh [&_img]:w-auto">
         <article v-for="{ idref, content } in loadedChunks" :key="idref" :id="idref">
            <div
               class="content-chunk prose mb-10 min-h-[50vh] max-w-none border-b border-gray-300 pb-10"
               v-html="content"
            ></div>
         </article>
      </main>

      <div v-if="databaseLoaded" ref="sentinel" class="flex h-16 w-full items-center justify-center"></div>
   </div>
</template>

<style scoped>
.content-chunk {
   content-visibility: auto;
   contain-intrinsic-size: 0 800px;
}
</style>
