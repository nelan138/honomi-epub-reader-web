<!-- eslint-disable vue/no-v-html -->
<template>
   <div>
      <!-- runtime tailwind classes

      prose-sm prose-base prose-lg prose-xl prose-2xl
      prose-p:leading-tight prose-p:leading-snug prose-p:leading-normal prose-p:leading-relaxed prose-p:leading-loose
      prose-p:tracking-tighter prose-p:tracking-tight prose-p:tracking-normal prose-p:tracking-wide prose-p:tracking-wider prose-p:tracking-widest
      [font-kerning:auto] [font-kerning:none]
      px-none px-compact px-normal px-relaxed px-spacious

      prose article below -->
      <article
         ref="scrollArea"
         :class="[
            'h-screen w-screen prose max-w-none prose-p:m-0 prose-p:text-default prose-headings:text-default prose-a:text-default',

            {
               '[writing-mode:horizontal-tb] overflow-y-scroll overflow-x-hidden':
                  settingsStore.writingMode === 'horizontal',
               '[writing-mode:vertical-rl] overflow-x-scroll overflow-y-hidden':
                  settingsStore.writingMode === 'vertical',
            },
            `prose-${settingsStore.fontSize}`,
            `prose-p:leading-${settingsStore.fontLeading}`,
            `prose-p:tracking-${settingsStore.fontTracking}`,
            `[font-kerning:${settingsStore.fontKerning}]`,
            `px-${settingsStore.bookPadding}`,
         ]"
         @scrollend="onScrollEnd"
         @wheel.prevent="onWheel"
      >
         <section
            v-for="section in readerStore.sections"
            :key="section.idref"
            :data-reference="section.idref"
            :class="[
               '[&_img]:block [&_img]:max-h-[80dvh] [&_img]:max-w-[80dvw] [&_img]:mx-auto',

               {
                  'w-full': settingsStore.writingMode === 'horizontal',
                  'h-full [&_img]:my-[10vw]': settingsStore.writingMode === 'vertical',
                  '[&_rt]:invisible': settingsStore.furiganaDisplay === 'none',
                  '[&_rt]:invisible [&_ruby:hover>rt]:visible': settingsStore.furiganaDisplay === 'hover',
               },
            ]"
         >
            <div v-html="section.content" />
         </section>
      </article>
   </div>
</template>

<script setup lang="ts">
definePageMeta({
   layout: 'reader',
});

const readerStore = useReaderStore();
const toast = useToast();
const route = useRoute();
const bookId = Number(route.params.id);
const settingsStore = useSettingsStore();

/* *** */

onMounted(async () => {
   /**
    * This block runs reader store set-up
    */
   const [, error] = await tryCatch(readerStore.load(bookId));
   if (error) {
      toast.add({
         title: 'Failed to load from database',
         description: error.message,
         color: 'error',
      });

      return;
   }

   readerStore.loadAnchorInternalLinks();

   const urls = readerStore.loadImages();
   blobUrls.push(...urls); // ! to be freed later on unmounted

   /**
    * Guards to ensure the block below runs as expected
    */
   await nextTick(); //  vue update component reactivity
   await nextFrame(); // DOM painting

   /**
    * The block below should run after Vue update all the components depending on readerStore and after the DOM finishes painting
    */
   readerStore.restoreLastSection();
});

onUnmounted(() => {
   blobUrls.forEach((url) => URL.revokeObjectURL(url));

   readerStore.$reset();
});

/* *** */

/** @use on mounted */
const blobUrls = [] as string[];

let progressCache = 0;

const getCurrentCharactersRead = () => {
   let headerHeight = 0;

   const header = document.querySelector('header');
   if (header) headerHeight = header.getBoundingClientRect().bottom;

   // x = the middle of the screen, y = top edge
   let x = globalThis.innerWidth / 2;
   let y = headerHeight + 10;

   // x = right edge, y = middle of the screen
   if (settingsStore.writingMode === 'vertical') {
      x = globalThis.innerWidth - 10;
      y = globalThis.innerHeight / 2;
   }

   const targetEl = document.elementFromPoint(x, y);

   if (!targetEl) {
      console.warn('[Reader] No element found at:', { x, y });
      return progressCache;
   }

   const paragraphEl = targetEl.closest('p[data-characters-read]');

   // * Direct match
   if (paragraphEl) {
      const attr = paragraphEl.getAttribute('data-characters-read') as string;

      progressCache = parseInt(attr);

      return progressCache;
   }

   // * Fallback
   else {
      const sectionEl = targetEl.closest('section[data-reference]');

      let currentSectionEl = sectionEl;
      let fallbackTargetEl = null as Element | null;

      while (currentSectionEl !== null) {
         const pEls = currentSectionEl.querySelectorAll('p[data-characters-read]');

         for (const pEl of pEls) {
            const rect = pEl.getBoundingClientRect();

            if (settingsStore.writingMode === 'horizontal' && rect.top > y) break;
            else if (settingsStore.writingMode === 'vertical' && rect.right < x) break;

            fallbackTargetEl = pEl;
         }

         if (fallbackTargetEl) break;

         currentSectionEl = currentSectionEl.previousElementSibling;
      }

      if (!fallbackTargetEl) return progressCache;

      const attr = fallbackTargetEl.getAttribute('data-characters-read') as string;

      progressCache = parseInt(attr);

      return progressCache;
   }
};

// Delay of 500ms
const onScrollEnd = useDebounceFn(() => {
   if (readerStore.isLoading || readerStore.isLoaded === false) return;

   readerStore.updateProgress(getCurrentCharactersRead(), { syncWithDb: true });
}, 500);

const scrollArea = ref<HTMLElement | null>(null);

const onWheel = (event: WheelEvent) => {
   if (!scrollArea.value) return;

   const delta = Math.sign(event.deltaY) * settingsStore.scrollSpeed;

   if (settingsStore.writingMode === 'horizontal') scrollArea.value.scrollTop += delta;
   else if (settingsStore.writingMode === 'vertical') scrollArea.value.scrollLeft -= delta;
};
</script>

<style scoped></style>
