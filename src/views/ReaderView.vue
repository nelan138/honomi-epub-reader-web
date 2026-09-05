<script setup lang="ts">
import Header from '@src/components/reader/Header.vue';
import { getBookFromDB } from '@src/services/dexie/bookRepo';

import type { ManifestItem, SpineItem } from '@src/types/epub';
import { strFromU8, unzipSync } from 'fflate';
import { onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const spine = ref<SpineItem[]>([]);
const manifest = ref<Map<string, ManifestItem>>();
const epubFile = ref<Blob>();
let unzippedEpubFile: Record<string, Uint8Array>;

type ContentChunk = string; // for sake of simplicity

async function getSpineItemContent(item: SpineItem) {
   if (!manifest.value || !epubFile.value) {
      throw new Error('Sth went really wrong');
   }
   const manifestItem = manifest.value.get(item.idref);
   if (!manifestItem) {
      throw new Error('Item not found');
   }

   const path = manifestItem.resolvedPath;
   const content = unzippedEpubFile[path];

   if (content) {
      const rawString = strFromU8(content);
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawString, 'application/xhtml+xml');
      return doc.body.innerHTML;
   } else {
      throw new Error('Content not found');
   }
}

const loadedChunks = ref<ContentChunk[]>([]);

let currentSpineIndex = 0;
let isLoading = false;
async function loadNextChunk() {
   if (isLoading) return;

   if (currentSpineIndex >= spine.value.length) {
      alert('End of content');
      return;
   }

   isLoading = true;

   try {
      const currentItem = spine.value[currentSpineIndex];
      if (currentItem === undefined) {
         alert('Sth went really wrong');
         return;
      }

      const content = await getSpineItemContent(currentItem);
      loadedChunks.value.push(content);
      currentSpineIndex++;
   } finally {
      isLoading = false;
   }
}

const reachedBottom = ref<HTMLDivElement | null>(null);

let observer: IntersectionObserver | null = null;

onMounted(async () => {
   const params = route.params.bookId as string | undefined;
   const bookId = params ? parseInt(params) : NaN;
   try {
      const result = await getBookFromDB(bookId);

      spine.value = result.spine;
      manifest.value = result.manifest;
      epubFile.value = result.epubFile;

      const buffer = await epubFile.value.arrayBuffer();
      unzippedEpubFile = unzipSync(new Uint8Array(buffer));
   } catch (e) {
      router.push('/book-not-found');
      return;
   }

   console.table(spine.value);
   console.table(Object.fromEntries(manifest.value));

   observer = new IntersectionObserver(async ([entry]: IntersectionObserverEntry[]) => {
      if (entry?.isIntersecting) {
         await loadNextChunk();
      }
   });

   if (reachedBottom.value) observer.observe(reachedBottom.value);
});

onUnmounted(() => {
   if (observer) observer.disconnect();
});
</script>

<template>
   <div
      class="bg-bg text-ink min-h-dvh max-w-dvw font-serif text-base leading-normal font-normal transition-colors md:text-xl lg:text-base"
   >
      <Header />

      <div class="reader-content px-4 md:px-10">
         <div
            v-for="(chunk, index) in loadedChunks"
            :key="index"
            v-html="chunk"
            class="mb-10 min-h-[50vh] border-b border-gray-300 pb-10"
         ></div>
      </div>

      <div ref="reachedBottom" class="flex h-16 w-full items-center justify-center"></div>
   </div>
</template>

<style scoped></style>
