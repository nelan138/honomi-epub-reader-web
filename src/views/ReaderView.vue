<script setup lang="ts">
import { useThemeStore } from '@src/stores/useThemeStore';
import { useReader } from '@src/composables/reader/useReader';
import { UnexpectedRuntimeError, unwrapAsync } from '@src/utils';

import type { Section } from '@src/services/epub/epubParser';
import { updateBookProgressInDB } from '@src/services/dexie/bookRepo';

/* *** */

const route = useRoute();
const router = useRouter();
const params = route.params.bookId as string | undefined;
const bookId = params ? parseInt(params) : NaN;

const { getBook } = useReader();

const sections = shallowRef<Section[]>([]);
const isLoading = computed(() => sections.value.length === 0);

const charCount = ref<number>(0);
const charOffset = ref<number>(0);

const progress = computed(() => {
   if (charCount.value === 0) return 0;
   return ((charOffset.value * 100) / charCount.value).toFixed(2);
});

const getUserReadingProgress = (): number => {
   let headerHeight = 0;
   const header = document.querySelector('header');
   if (!header) headerHeight = 0;
   else headerHeight = header.getBoundingClientRect().height;

   const x = screen.width / 2;
   const y = headerHeight + 1;

   const start = document.elementFromPoint(x, y);
   if (!start) {
      console.warn('No element found at the specified point');
      return 0;
   }

   let p: HTMLParagraphElement | null = null;

   const directMatch = start.closest('p');

   if (directMatch) {
      p = directMatch;
   } else {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      walker.currentNode = start;

      while (walker.previousNode()) {
         const node = walker.currentNode as Element;
         if (node.tagName === 'P') {
            p = node as HTMLParagraphElement;
            break;
         }
      }
   }

   if (!p) return 0;

   const _charOffset = p.getAttribute('data-char-offset');
   if (!_charOffset) throw new UnexpectedRuntimeError('Missing data-char-offset attribute on paragraph element');

   const value = parseInt(_charOffset);
   if (isNaN(value)) throw new UnexpectedRuntimeError('Invalid data-char-offset attribute value on paragraph element');

   return value;
};

// ! < > Execute every time user stops scrolling
const onScrollEnd = () => {
   charOffset.value = getUserReadingProgress();
   updateBookProgressInDB(bookId, charOffset.value); // runs in bg
};

onMounted(async () => {
   const [book, error] = await unwrapAsync(getBook(bookId));
   if (!book) {
      console.warn(error.message);
      router.push('/404');
      return;
   }
   sections.value = book.sections;

   await nextTick();
   charCount.value = book.charCount;
   charOffset.value = book.readCharCount;

   const paragraphs = Array.from(document.querySelectorAll<HTMLElement>('p[data-char-offset]'));

   let target: HTMLElement | undefined;
   for (const p of paragraphs) {
      const value = p.getAttribute('data-char-offset');
      if (!value) throw new UnexpectedRuntimeError('Missing data-char-offset attribute on paragraph element');
      if (parseInt(value) <= book.readCharCount) {
         target = p;
      } else break;
   }

   requestAnimationFrame(() => {
      if (book.readCharCount === 0) window.scrollTo({ top: 0 });
      else {
         target?.scrollIntoView({
            behavior: 'instant',
            block: 'start',
         });
      }

      document.addEventListener('scrollend', onScrollEnd, { passive: false });
   });
});

onUnmounted(() => {
   document.removeEventListener('scrollend', onScrollEnd);
});

const themeStore = useThemeStore();
onMounted(() => {
   themeStore.load();
});
</script>

<template>
   <ReaderHeader @return="router.push('/')" @toggle-theme="themeStore.toggleTheme" />
   <div
      v-if="isLoading"
      class="text-ink/60 flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 p-8 font-sans"
   >
      <i class="fa-solid fa-circle-notch text-highlight animate-spin text-2xl"></i>
      <span class="text-xs font-medium tracking-widest uppercase">Loading...</span>
   </div>

   <div v-else class="p-4 font-sans">
      <ul>
         <li v-for="section in sections" :key="section.idref">
            <BookChapter :content="section.content" />
         </li>
      </ul>

      <footer class="sticky bottom-0 z-50 py-2 text-right text-xs">
         <span> {{ charOffset }}/{{ charCount }} - </span>
         <span> {{ progress }}% </span>
      </footer>
   </div>
</template>

<style scoped></style>
