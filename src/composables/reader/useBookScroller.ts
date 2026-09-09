import { nextTick } from 'vue';

export function useBookScroller() {
   function getCurrentPIndex(): number | null {
      const header = document.querySelector('header');
      const y = header
         ? Math.ceil(header.getBoundingClientRect().bottom) + 10
         : 0; // 10px below the header
      const x = globalThis.innerWidth / 2;

      // Land directly on <p>
      const target = document.elementFromPoint(x, y);
      const direct = target?.closest('[data-p-index]');
      if (direct) {
         const index = direct.getAttribute('data-p-index');
         return index != null ? Number(index) : null;
      }

      // Runs backward - fallback using ... binary search (?)
      const paragraphs = document.querySelectorAll<HTMLElement>(
         '[data-p-index]',
      );
      if (!paragraphs.length) return null;

      let left = 0;
      let right = paragraphs.length - 1;
      let matchIndex: number | null = null;

      while (left <= right) {
         const mid = (left + right) >> 1;
         const p = paragraphs[mid];
         if (!p) break;

         const rect = p.getBoundingClientRect();

         if (rect.top <= y && rect.bottom >= y) {
            matchIndex = mid;
            break;
         }

         // >= reading line
         if (rect.top <= y) {
            matchIndex = mid;
            left = mid + 1;
         }
         else { right = mid - 1; // < reading line
          }
      }

      const resolvedIndex = matchIndex ?? 0;
      const indexStr = paragraphs[resolvedIndex]?.getAttribute('data-p-index');
      return indexStr != null ? Number(indexStr) : null;
   }

   const restoreScrollPosition = async (
      savedCharCount: number,
      cumulativeCharacterCount: Map<number, number>,
   ) => {
      let targetIndex: number | null = null;
      for (const [pIndex, count] of cumulativeCharacterCount.entries()) {
         if (count >= savedCharCount) {
            targetIndex = pIndex;
            break;
         }
      }

      if (targetIndex === null) return;
      await nextTick();

      const targetElement = document.querySelector<HTMLElement>(
         `[data-p-index="${targetIndex}"]`,
      );
      if (!targetElement) return;

      const header = document.querySelector('header');
      const headerHeight = header ? header.offsetHeight : 0;

      targetElement.style.scrollMarginTop = `${headerHeight + 10}px`;

      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
   };

   return { restoreScrollPosition, getCurrentPIndex };
}
