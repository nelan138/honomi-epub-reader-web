<script setup lang="ts">
import ContentChunk from '@src/components/reader/ContentChunk.vue';
import Header from '@src/components/reader/Header.vue';
import { getBookFromDB } from '@src/services/dexie/bookRepo';
import type { ManifestItem, ResourcePath, SpineItem } from '@src/types/epub';

import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const params = route.params.bookId as string | undefined;
const bookId = params ? parseInt(params) : NaN;

type Idref = string;
type SpineItemContent = string;

let epubData: Record<ResourcePath, Uint8Array> = {};
let manifest = new Map<string, ManifestItem>();
let spineItems: SpineItem[] = [];
const spineItemContentMap = new Map<Idref, SpineItemContent>();

let observer: IntersectionObserver | null = null;
const reachedBottom = ref<HTMLElement | null>(null);

let currentSpinItemIndex = 0;
let contentIsLoading = false;

// Fixed the naming collision here!
const loadedChunks = ref<{ idref: Idref; content: string }[]>([]);

// --- HELPERS & PARSERS ---

const normalizePath = (path: string): string => {
   const parts: string[] = [];
   for (const part of path.replaceAll('\\', '/').split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') {
         if (parts.length === 0) throw new Error(`Path escapes root: ${path}`);
         parts.pop();
         continue;
      }
      parts.push(part);
   }
   return parts.join('/');
};

const resolvePath = (basePath: string, relativePath: string): string => {
   const baseParts = normalizePath(basePath).split('/');
   baseParts.pop();
   return normalizePath([...baseParts, relativePath].join('/'));
};

const fetchAndParseChapter = async (idref: string): Promise<string> => {
   const manifestItem = manifest.get(idref);
   if (!manifestItem) return `<p>Error: ${idref} not found</p>`;

   const chapterPath = manifestItem.resolvedPath;
   const fileData = epubData[chapterPath];
   if (!fileData) return `<p>Error: File missing</p>`;

   const rawXhtml = new TextDecoder('utf-8').decode(fileData);
   const doc = new DOMParser().parseFromString(rawXhtml, 'application/xhtml+xml');

   if (doc.getElementsByTagName('parsererror').length > 0) {
      console.error(`Invalid XML in EPUB entry: ${chapterPath}`);
      return `<p>Error parsing chapter.</p>`;
   }

   const body = doc.querySelector('body');
   if (!body) return '';

   const images = body.querySelectorAll('img, image');
   for (const img of images) {
      const src = img.getAttribute('src') || img.getAttribute('href') || img.getAttribute('xlink:href');
      if (!src) continue;

      const imgZipPath = resolvePath(chapterPath, src);
      const imgData = epubData[imgZipPath];

      if (imgData) {
         const safeBytes = new Uint8Array(imgData);
         const blobUrl = URL.createObjectURL(new Blob([safeBytes.buffer]));
         img.tagName.toLowerCase() === 'image' ? img.setAttribute('href', blobUrl) : img.setAttribute('src', blobUrl);
      }
   }

   return body.innerHTML;
};

// --- LAZY LOADING CACHE ---

const loadNextContentToChunks = async (): Promise<boolean> => {
   if (currentSpinItemIndex >= spineItems.length) return false;

   const spineItem = spineItems[currentSpinItemIndex++];
   if (!spineItem) return false;

   let content = spineItemContentMap.get(spineItem.idref);
   if (!content) {
      content = await fetchAndParseChapter(spineItem.idref);
      spineItemContentMap.set(spineItem.idref, content);
   }

   loadedChunks.value.push({ idref: spineItem.idref, content });
   return true;
};

// --- OBSERVER TRIGGER ---

const appendNextChunk = async () => {
   if (contentIsLoading) return;
   if (currentSpinItemIndex >= spineItems.length) {
      observer?.disconnect();
      return;
   }

   contentIsLoading = true;

   await loadNextContentToChunks();

   await nextTick();
   contentIsLoading = false;

   requestAnimationFrame(() => {
      if (!reachedBottom.value) return;
      const rect = reachedBottom.value.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 800) {
         appendNextChunk();
      }
   });
};

// --- LIFECYCLE ---

onMounted(async () => {
   try {
      const bookRecord = await getBookFromDB(bookId);
      spineItems = bookRecord.spine;
      manifest = bookRecord.manifest;
      epubData = bookRecord.epubData;
   } catch (e) {
      router.push('/error/book-not-found');
      return;
   }

   const BUFFER_ZONE = 800;
   while (currentSpinItemIndex < spineItems.length) {
      await loadNextContentToChunks();
      await nextTick();

      if (reachedBottom.value) {
         const rect = reachedBottom.value.getBoundingClientRect();
         if (rect.top > window.innerHeight + BUFFER_ZONE) {
            break;
         }
      }
   }

   observer = new IntersectionObserver(
      ([entry]) => {
         if (entry?.isIntersecting) {
            appendNextChunk();
         }
      },
      {
         root: null,
         rootMargin: '800px 0px',
         threshold: 0,
      }
   );

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
         <ContentChunk
            v-for="item in loadedChunks"
            :key="item.idref"
            :chunk="item.content"
            class="content-chunk mb-10 min-h-[50vh] border-b border-gray-300 pb-10"
         />
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
