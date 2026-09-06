<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import Header from '@src/components/reader/Header.vue';
import { useReader } from '@src/composables/reader/useReader';
import { useBottomSentinel } from '@src/composables/reader/useSentinel';

const route = useRoute();
const params = route.params.bookId as string | undefined;
const bookId = params ? parseInt(params) : NaN;

const { loadedChunks, loadNextContentToChunks, isReady: databaseLoaded } = useReader(bookId);

const sentinel = ref<Element>();
useBottomSentinel(sentinel, loadNextContentToChunks, { executeWhileVisible: true });
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
      <div v-if="databaseLoaded" ref="sentinel" class="flex h-16 w-full items-center justify-center"></div>
   </div>
</template>

<style scoped>
.content-chunk {
   content-visibility: auto;
   contain-intrinsic-size: 0 800px;
}
</style>
