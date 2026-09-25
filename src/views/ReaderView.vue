<script setup lang="ts">
import { DrawerClose, DrawerContent, DrawerOverlay, DrawerPortal, DrawerRoot, DrawerTitle } from 'reka-ui';
import { useThemeStore } from '@src/stores/useThemeStore';
import { cleanUpBlobUrls, RuntimeError, tryCatch } from '@src/utils';

import { getBookFromDB, updateCharactersReadInDB } from '@src/services/dexie/bookRepo';
import { useReaderStore } from '@src/stores/useReaderStore';
import { useDebounceFn } from '@vueuse/core';
import { URI_SCHEME_REGEX } from '@src/services/epub/epubParser';

/* *** */

const themeStore = useThemeStore();

onMounted(() => {
   themeStore.load();
});

const readerStore = useReaderStore();

const route = useRoute();
const router = useRouter();

const params = route.params.bookId as string | undefined;
const bookId = params ? parseInt(params) : NaN;

// LoadingをまってScrollingを実行する
onMounted(async () => {
   const [_, error] = await tryCatch(getBookFromDB(bookId));

   if (error) {
      console.warn('[Reader]', error.message);
      router.push('/404');
      return;
   }

   await readerStore.load(bookId);

   await nextTick();

   if (readerStore.charactersRead === 0) {
      globalThis.scrollTo({ top: 0 });
   } else {
      const target = document.querySelector<HTMLElement>(`p[data-characters-read="${readerStore.charactersRead}"]`);
      if (!target) {
         throw new RuntimeError(`No paragraph found with data-characters-read="${readerStore.charactersRead}"`);
      }

      target.scrollIntoView({ behavior: 'instant', block: 'start' });
   }

   requestAnimationFrame(() => {
      globalThis.addEventListener('scrollend', onScrollEnd);
   });
});

// Delay of 500ms
const onScrollEnd = useDebounceFn(() => {
   const charactersRead = getCurrentCharactersRead();
   if (charactersRead === readerStore.charactersRead) return;

   readerStore.updateCharactersRead(charactersRead, { syncWithDb: true });
}, 500);

onUnmounted(() => {
   updateCharactersReadInDB(bookId, readerStore.charactersRead);
});

onUnmounted(() => {
   cleanUpBlobUrls(readerStore.blobUrls);
});

onUnmounted(() => {
   globalThis.removeEventListener('scrollend', onScrollEnd);
   if ('cancel' in onScrollEnd) onScrollEnd.cancel();
});

onUnmounted(() => {
   readerStore.reset();
   themeStore.reset();
});

// Characters read of each section
const sectionTails = computed(() => {
   if (!readerStore.isLoaded || readerStore.isLoading) return [];

   const sections = document.querySelectorAll('article > section');
   if (sections.length === 0) return [];

   const offsets: number[] = [];

   for (const section of sections) {
      const paragraphs = section.querySelectorAll('p[data-characters-read]');
      const lastP = paragraphs[paragraphs.length - 1];

      if (!lastP) {
         offsets.push(offsets.at(-1) ?? 0);
         continue;
      }

      const charOffset = lastP.getAttribute('data-characters-read');
      if (!charOffset) {
         throw new RuntimeError('Missing data-characters-read attribute on paragraph');
      }

      offsets.push(parseInt(charOffset, 10));
   }

   return offsets;
});

let charOffsetCache = 0;

const getCurrentCharactersRead = () => {
   let headerHeight = 0;
   const header = document.querySelector('header');
   if (header) headerHeight = header.getBoundingClientRect().bottom;

   const x = globalThis.innerWidth / 2;
   const y = headerHeight + 10;

   const targetEl = document.elementFromPoint(x, y);
   if (!targetEl) {
      console.warn('[Reader] No element found at:', { x, y });
      return charOffsetCache;
   }

   let paragraphEl = targetEl.closest('p');

   if (paragraphEl) {
      const attr = paragraphEl.getAttribute('data-characters-read');
      if (!attr) throw new RuntimeError('No data-characters-read attribute found on <p> element');

      const offset = parseInt(attr);
      charOffsetCache = offset;
      return offset;
   }

   // * Fallback 1: There may exist >= 1 <p> in the current <section>
   else {
      const sectionEl = targetEl.closest('section[data-section-index]');
      if (!sectionEl) {
         console.warn('[Reader] Scrolled out of all rendered sections');
         return charOffsetCache;
      }

      for (const p of sectionEl.querySelectorAll('p')) {
         if (p.getBoundingClientRect().top > y) break;

         paragraphEl = p;
      }

      if (paragraphEl) {
         const attr = paragraphEl.getAttribute('data-characters-read');
         if (!attr) throw new RuntimeError('No data-characters-read attribute found on <p> element');

         const offset = parseInt(attr);
         charOffsetCache = offset;
         return offset;
      }

      // * Fallback 2: There may exist >= 1 <p> in previous section(s)
      else {
         const sectionIndexAttr = sectionEl.getAttribute('data-section-index');
         if (!sectionIndexAttr) throw new RuntimeError('No data-section-index attribute found on <section> element');

         const sectionIndex = parseInt(sectionIndexAttr);
         if (sectionIndex === 0) {
            console.warn('[Reader] No previous section found, returning 0');
            charOffsetCache = 0;
            return 0;
         }
         const offset = sectionTails.value[sectionIndex - 1];
         if (offset === undefined) throw new RuntimeError('No offset found for previous section');
         charOffsetCache = offset;
         return offset;
      }
   }
};

// replaces href default behavior on clicked
const onAnchorsClicked = (event: MouseEvent) => {
   const target = event.target as HTMLElement | null;
   const anchor = target?.closest('a');
   if (!anchor) return;

   const href = anchor.getAttribute('href');
   if (!href) return;

   if (URI_SCHEME_REGEX.test(href) || event.ctrlKey || event.metaKey || event.button === 1) {
      return;
   }

   event.preventDefault();

   // scroll into view
   const [path, fragment] = href.split('#');

   if (fragment) {
      const targetEl = document.getElementById(fragment);
      if (targetEl) {
         targetEl.scrollIntoView({ behavior: 'smooth' });
      }
   } else if (path) {
      const targetSectionEl = document.querySelector(`[data-path-ref="${path}"]`);
      if (targetSectionEl) {
         targetSectionEl.scrollIntoView({ behavior: 'smooth' });
      }
   }
};

const openHeader = ref(true);
const openToc = ref(false);
</script>

<template>
   <Header class="fixed z-100" v-if="openHeader">
      <ul class="flex gap-6">
         <li>
            <button @click="router.push('/')" type="button" class="hover:cursor-pointer">
               <i class="fa-solid fa-left-long"></i>
            </button>
         </li>

         <li>
            <button
               @click="
                  () => {
                     openHeader = false;
                     openToc = true;
                  }
               "
               type="button"
               class="hover:cursor-pointer"
            >
               <i class="fa-solid fa-list"></i>
            </button>
         </li>

         <li>
            <button @click="openHeader = false" type="button" class="hover:cursor-pointer">
               <i class="fa-solid fa-angle-up"></i>
            </button>
         </li>
      </ul>

      <ul class="flex gap-6">
         <li>
            <button @click="themeStore.toggleTheme" type="button" class="hover:cursor-pointer">
               <i class="fa-solid fa-circle-half-stroke scale-[110%]"></i>
            </button>
         </li>
      </ul>
   </Header>

   <!-- Header toggle -->
   <div v-else class="fixed top-0 left-0 z-50 flex h-10 items-center justify-end bg-transparent px-4">
      <button @click="openHeader = true" type="button" class="hover:cursor-pointer">
         <i class="fa-solid fa-chevron-down"></i>
      </button>
   </div>

   <!-- Loading screen -->
   <div
      v-if="readerStore.isLoading"
      class="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 p-8 font-sans"
   >
      <i class="fa-solid fa-circle-notch animate-spin text-2xl text-(--ink)"></i>
      <span class="text-xs font-medium tracking-widest uppercase">Loading...</span>
   </div>

   <template v-else>
      <DrawerRoot v-if="openToc" v-model:open="openToc">
         <DrawerPortal :disabled="true">
            <DrawerOverlay class="fixed inset-0 z-50 bg-black/50" />
            <DrawerContent
               :disable-outside-pointer-events="false"
               class="fixed top-0 left-0 z-100 h-full w-80 max-w-[85vw] bg-(--background) p-4 text-(--ink)"
               as="aside"
            >
               <DrawerTitle>Table of Content</DrawerTitle>
               <DrawerClose class="absolute top-4 right-4 hover:cursor-pointer">
                  <i class="fa-solid fa-xmark"></i>
               </DrawerClose>

               <ul
                  @click="
                     (event) => {
                        openToc = false;
                        onAnchorsClicked(event);
                     }
                  "
               >
                  <li v-for="{ label, href } in readerStore.navigation">
                     <a :href="href"> {{ label }} </a>
                  </li>
               </ul>
            </DrawerContent>
         </DrawerPortal>
      </DrawerRoot>

      <article
         @click="onAnchorsClicked"
         class="prose prose-headings:text-(--ink) w-full max-w-full p-4 py-4 font-sans text-(--ink) md:px-16 xl:px-32 2xl:px-64"
      >
         <section
            v-for="(section, index) in readerStore.sections"
            :key="section.idref"
            :data-id-ref="section.idref"
            :data-path-ref="section.path"
            :data-section-index="index"
            v-html="section.content"
            class="[&_img,&_svg]:mx-auto [&_img,&_svg]:block [&_img,&_svg]:max-h-[80dvh] [&_img,&_svg]:max-w-[80dvw]"
         ></section>
      </article>

      <footer class="sticky bottom-0 z-50 py-2 text-right font-sans text-xs">
         <span>{{ readerStore.charactersRead }} / {{ readerStore.totalCharacters }}</span>
         <span class="mx-2">ー</span>
         <span> {{ readerStore.progress }}% </span>
      </footer>
   </template>
</template>

<style scoped></style>
