<template>
   <div
      class="h-screen w-screen"
      :class="[
         {
            '[writing-mode:horizontal-tb] overflow-y-scroll overflow-x-hidden *:w-full': orientation === 'horizontal',
            '[writing-mode:vertical-rl] overflow-x-scroll overflow-y-hidden *:h-full [&_img]:my-[10vw]':
               orientation === 'vertical',
         },
      ]"
      @scrollend="onScrollEnd"
      @wheel.prevent="onWheel"
   >
      <slot />
   </div>
</template>

<script lang="ts" setup>
const { orientation, scrollSpeed = 80 } = defineProps<{
   orientation: 'horizontal' | 'vertical';
   scrollSpeed?: number;
}>();

const readerStore = useReaderStore();

/* *** */

let progressCache = 0;

const getCurrentCharactersRead = () => {
   let headerHeight = 0;

   const header = document.querySelector('header');
   if (header) headerHeight = header.getBoundingClientRect().bottom;

   // x = the middle of the screen, y = top edge
   let x = globalThis.innerWidth / 2;
   let y = headerHeight + 10;

   // x = right edge, y = middle of the screen
   if (orientation === 'vertical') {
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

            if (orientation === 'horizontal' && rect.top > y) break;
            else if (orientation === 'vertical' && rect.right < x) break;

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

const onWheel = (event: WheelEvent) => {
   const element = event.currentTarget as HTMLElement;
   const delta = Math.sign(event.deltaY) * scrollSpeed;

   if (orientation === 'horizontal') {
      element.scrollTop += delta;
   } else if (orientation === 'vertical') {
      element.scrollLeft -= delta;
   }
};
</script>

<style></style>
