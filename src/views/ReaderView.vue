<script setup lang="ts">
import { useThemeStore } from '@src/stores/useThemeStore';
import { cleanUpBlobUrls, domParser, UnexpectedRuntimeError, unwrapAsync } from '@src/utils';

import { getBookFromDB, updateBookProgressInDB } from '@src/services/dexie/bookRepo';
import { useReaderStore } from '@src/stores/useReaderStore';
import BookSection from '@src/components/reader/BookSection.vue';

/* *** */

const themeStore = useThemeStore();

onMounted(() => {
   themeStore.load();
});

const onScrollEnd = () => {
   const currentCharOffset = getCurrentCharOffset();
   readerStore.updateReadCharCount(currentCharOffset);
   console.log('Scroll ended. Current char offset:', currentCharOffset);
};

onMounted(() => {
   document.addEventListener('scrollend', onScrollEnd);
});

const readerStore = useReaderStore();

const route = useRoute();
const router = useRouter();

const params = route.params.bookId as string | undefined;
const bookId = params ? parseInt(params) : NaN;

// LoadingをまってScrollingを実行する
onMounted(async () => {
   const [_, error] = await unwrapAsync(getBookFromDB(bookId));

   if (error) {
      console.warn(error.message);
      router.push('/404');
      return;
   }

   await readerStore.load(bookId);

   // await nextTick();

   if (readerStore.readCharCount === 0) {
      window.scrollTo({ top: 0 });
      return;
   }

   const target = document.querySelector(`p[data-char-offset="${readerStore.readCharCount}"]`);
   if (!target) {
      throw new UnexpectedRuntimeError(`No paragraph found with data-char-offset="${readerStore.readCharCount}"`);
   }

   target?.scrollIntoView({
      behavior: 'instant',
      block: 'start',
   });
});

onUnmounted(() => {
   updateBookProgressInDB(bookId, readerStore.readCharCount);
});

onUnmounted(() => {
   cleanUpBlobUrls(readerStore.blobUrls);
});

onUnmounted(() => {
   document.removeEventListener('scrollend', onScrollEnd);
});

onUnmounted(() => {
   readerStore.reset();
   themeStore.reset();
});

const sectionTails = computed(() => {
   if (!readerStore.isLoaded || readerStore.isLoading) return [];
   const offsets: number[] = [];

   for (const section of readerStore.sections) {
      const doc = domParser.parseFromString(section.content, 'application/xhtml+xml');

      const paragraphs = Array.from(doc.querySelectorAll('p'));
      const lastP = paragraphs.at(-1);

      if (!lastP) {
         offsets.push(0);
         continue;
      }

      const charOffset = lastP.getAttribute('data-char-offset');
      if (!charOffset) throw new UnexpectedRuntimeError('No data-char-offset attribute found on <p> element');

      offsets.push(parseInt(charOffset));
   }

   return offsets;
});

let charOffsetCache = 0;

const getCurrentCharOffset = () => {
   let headerHeight = 0;
   const header = document.querySelector('header');
   if (header) headerHeight = header.getBoundingClientRect().bottom;

   const x = globalThis.innerWidth / 2;
   const y = headerHeight + 10;

   const targetEl = document.elementFromPoint(x, y);
   if (!targetEl) {
      console.warn('No element found at the specified point (x, y):', { x, y });
      return charOffsetCache;
   }

   let paragraphEl = targetEl.closest('p');

   if (paragraphEl) {
      const attr = paragraphEl.getAttribute('data-char-offset');
      if (!attr) throw new UnexpectedRuntimeError('No data-char-offset attribute found on <p> element');

      const offset = parseInt(attr);
      charOffsetCache = offset;
      return offset;
   }

   // * Fallback 1: There may exist >= 1 <p> in the current <section>
   else {
      const sectionEl = targetEl.closest('section[data-section-index]');
      if (!sectionEl) {
         console.warn('Somehow user have scroll out of all rendered sections');
         return charOffsetCache;
      }

      for (const p of sectionEl.querySelectorAll('p')) {
         if (p.getBoundingClientRect().top > y) break;

         paragraphEl = p;
      }

      if (paragraphEl) {
         const attr = paragraphEl.getAttribute('data-char-offset');
         if (!attr) throw new UnexpectedRuntimeError('No data-char-offset attribute found on <p> element');

         const offset = parseInt(attr);
         charOffsetCache = offset;

         return offset;
      }

      // * Fallback 2: There may exist >= 1 <p> in previous section(s)
      else {
         const sectionIndexAttr = sectionEl.getAttribute('data-section-index');
         if (!sectionIndexAttr)
            throw new UnexpectedRuntimeError('No data-section-index attribute found on <section> element');

         const sectionIndex = parseInt(sectionIndexAttr);
         if (sectionIndex === 0) {
            charOffsetCache = 0;
            return 0;
         }

         const offset = sectionTails.value[sectionIndex - 1];
         if (offset === undefined) throw new UnexpectedRuntimeError('No offset found for previous section');

         charOffsetCache = offset;
         return offset;
      }
   }
};
</script>

<template>
   <ReaderHeader @return="router.push('/')" @toggle-theme="themeStore.toggleTheme" />
   <div
      v-if="readerStore.isLoading"
      class="text-ink/60 flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 p-8 font-sans"
   >
      <i class="fa-solid fa-circle-notch text-highlight animate-spin text-2xl"></i>
      <span class="text-xs font-medium tracking-widest uppercase">Loading...</span>
   </div>

   <div v-else class="p-4 font-sans">
      <article>
         <section
            :data-section-index="index"
            :data-idref="section.idref"
            v-for="(section, index) in readerStore.sections"
            :key="section.idref"
         >
            <BookSection :content="section.content" />
         </section>
      </article>

      <footer class="sticky bottom-0 z-50 py-2 text-right text-xs">
         
         <span> {{ readerStore.progress }}% </span>
      </footer>
   </div>
</template>

<style scoped></style>
