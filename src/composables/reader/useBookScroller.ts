import { nextTick } from 'vue';
import { UnexpectedRuntimeError } from '@src/types.ts';

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
         if (!index) throw new UnexpectedRuntimeError('No pIndex was set');

         return Number(index);
      }

      const paragraphs = document.querySelectorAll<HTMLElement>(
         '[data-p-index]',
      );
      if (!paragraphs.length) {
         console.warn(
            'Either this book has no <p> or your there is no pIndex',
         );
         return null;
      }

      // Runs backward - fallback using ... binary search (?)
      let left = 0;
      let right = paragraphs.length - 1;

      let matchingIndex: number = 0;

      while (left <= right) {
         const mid = (left + right) >> 1;
         const p = paragraphs[mid];
         if (!p) break;

         const rect = p.getBoundingClientRect();

         if (rect.top <= y && rect.bottom >= y) {
            matchingIndex = mid;
            break;
         }

         if (rect.top <= y) {
            matchingIndex = mid;
            left = mid + 1;
         }
         else { right = mid - 1; }
      }

      const index = paragraphs[matchingIndex]!.getAttribute('data-p-index');
      if (!index) throw new UnexpectedRuntimeError('No pIndex was set');

      return Number(index);
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
      const headerOffset = header
         ? Math.ceil(header.getBoundingClientRect().bottom) + 10
         : 0;

      targetElement.style.scrollMarginTop = `${headerOffset}px`;

      targetElement.scrollIntoView({ behavior: 'instant', block: 'start' });
   };

   return { restoreScrollPosition, getCurrentPIndex };
}
