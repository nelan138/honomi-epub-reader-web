<!-- eslint-disable vue/no-v-html -->
<template>
   <UScrollArea
      as="article"
      class="h-full prose w-full max-w-none [&_img]:mx-auto [&_img]:block [&_img]:max-h-[80dvh] [&_img]:max-w-[80dvw]"
   >
      <!-- prose-sm prose-base prose-lg prose-xl prose-2xl -->
      <section
         v-for="(section, index) in readerStore.sections"
         :key="section.idref"
         :data-index="index"
         :class="[`prose-${settingsStore.fontSize}`]"
         class="prose-p:m-0 prose-p:text-default prose-headings:text-default prose-a:text-default"
         v-html="section.content"
      />
   </UScrollArea>
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
   if (readerStore.charactersRead !== 0) {
      let targetEl: Element | null = null;
      const paragraphs = document.querySelectorAll('p[data-characters-read]');

      for (const pEl of paragraphs) {
         const charactersRead = Number(pEl.getAttribute('data-characters-read'));

         // take the first one, skips all the one with duplicate characters read (e.g: pictures)
         if (charactersRead === Number(targetEl?.getAttribute('data-characters-read'))) {
            continue;
         }

         if (charactersRead > readerStore.charactersRead) break;
         else {
            targetEl = pEl;
         }
      }

      if (targetEl) targetEl.scrollIntoView({ block: 'start' });
      console.log('Finsihed scrolling');
   }

   await nextFrame();
   document.addEventListener('scrollend', onScrollEnd);
});

onUnmounted(() => {
   document.removeEventListener('scrollend', onScrollEnd);
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

   const x = globalThis.innerWidth / 2;
   const y = headerHeight + 10;

   const targetEl = document.elementFromPoint(x, y);

   if (!targetEl) {
      console.warn('[Reader] No element found at:', { x, y });
      return progressCache;
   }

   const paragraphEl = targetEl.closest('p[data-characters-read]');

   // * Direct match
   if (paragraphEl) {
      const attr = paragraphEl.getAttribute('data-characters-read');
      if (!attr) {
         console.warn('[Reader] No data-characters-read attribute found on <p> element');
         return progressCache;
      }

      const offset = parseInt(attr);
      progressCache = offset;

      return offset;
   }

   // * Fallback
   else {
      const sectionEl = targetEl.closest('section[data-index]');

      let currentSectionEl = sectionEl;
      let fallbackTargetEl = null as Element | null;

      while (currentSectionEl !== null) {
         const pEls = currentSectionEl.querySelectorAll('p[data-characters-read]');

         for (const pEl of pEls) {
            if (pEl.getBoundingClientRect().top > y) break;
            fallbackTargetEl = pEl;
         }

         if (pEls.length > 0) break;

         currentSectionEl = currentSectionEl.previousElementSibling;
      }

      if (!fallbackTargetEl) return progressCache;

      const attr = fallbackTargetEl.getAttribute('data-characters-read');
      if (!attr) return progressCache;

      progressCache = parseInt(attr);
      return progressCache;
   }
};

// Delay of 500ms
const onScrollEnd = useDebounceFn(() => {
   if (readerStore.isLoading || readerStore.isLoaded === false) return;

   readerStore.updateProgress(getCurrentCharactersRead(), { syncWithDb: true });
}, 500);
</script>

<style scoped></style>
