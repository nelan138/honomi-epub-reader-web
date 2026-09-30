<!-- eslint-disable vue/no-v-html -->
<template>
   <article
      class="flow-root prose prose-p:text-default prose-headings:text-default prose-a:text-default w-full max-w-none [&_img]:mx-auto [&_img]:block [&_img]:max-h-[80dvh] [&_img]:max-w-[80dvw]"
   >
      <section
         v-for="(section, index) in readerStore.sections"
         :key="section.idref"
         :data-index="index"
         v-html="section.content"
      />
   </article>
</template>

<script setup lang="ts">
definePageMeta({
   layout: 'reader',
});
const readerStore = useReaderStore();
const route = useRoute();

/* *** */

const bookId = Number(route.params.id);
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

// Delay of 1000ms
const onScrollEnd = useDebounceFn(() => {
   if (readerStore.isLoading || readerStore.isLoaded === false) return;

   readerStore.updateProgress(getCurrentCharactersRead(), { syncWithDb: true });
}, 1000);

onMounted(() => {
   globalThis.addEventListener('scrollend', onScrollEnd);
});

onMounted(async () => {
   await readerStore.load(bookId);

   readerStore.loadAnchorInternalLinks();

   const result = readerStore.loadImages();
   blobUrls.push(...result);

   await nextTick();
   await nextFrame();

   if (readerStore.charactersRead === 0) return;

   let targetEl: Element | null = null;
   const paragraphs = document.querySelectorAll('p[data-characters-read]');

   for (const pEl of paragraphs) {
      const charactersRead = Number(pEl.getAttribute('data-characters-read'));

      // take the first one
      if (Number.isNaN(charactersRead) || charactersRead === Number(targetEl?.getAttribute('data-characters-read'))) {
         continue;
      }

      if (charactersRead <= readerStore.charactersRead) {
         targetEl = pEl;
      } else {
         break;
      }
   }

   if (targetEl) {
      targetEl.scrollIntoView({ block: 'start' });
   }
});

onUnmounted(() => {
   blobUrls.forEach((url) => {
      URL.revokeObjectURL(url);
   });

   readerStore.$reset();
});
</script>

<style scoped></style>
