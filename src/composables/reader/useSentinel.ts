import { nextTick, onMounted, onUnmounted, type Ref, ref, watch } from 'vue';

type SentinelOptions = {
   buffer?: number;
   executeWhileVisible?: boolean;
};

export function useBottomSentinel(
   sentinel: Ref<Element | null | undefined>,
   callback: () => boolean | void | Promise<boolean | void>,
   options: SentinelOptions = {},
) {
   const { buffer = 800, executeWhileVisible = false } = options;

   const isIntersecting = ref(false);
   let observer: IntersectionObserver | null = null;
   let isExecuting = false;
   let isTerminated = false;
   let rafId: number | null = null;

   const disconnect = () => {
      isTerminated = true;
      observer?.disconnect();
      observer = null;
      if (rafId !== null) {
         cancelAnimationFrame(rafId);
         rafId = null;
      }
   };

   const runCallback = async (): Promise<boolean> => {
      if (isExecuting || isTerminated) return false;
      isExecuting = true;
      try {
         const result = await callback();
         // If it explicitly returns false, the book is finished!
         if (result === false) {
            disconnect();
            return false;
         }
         return true;
      }
      finally {
         isExecuting = false;
      }
   };

   const checkAndFill = async () => {
      if (
         !isIntersecting.value || isExecuting || isTerminated || !sentinel.value
      ) { return; }

      const hasMore = await runCallback();
      if (!hasMore) return;

      await nextTick();

      const rect = sentinel.value?.getBoundingClientRect();
      if (rect && rect.top <= globalThis.innerHeight + buffer) {
         rafId = requestAnimationFrame(() => {
            rafId = null;
            checkAndFill();
         });
      }
   };

   onMounted(() => {
      observer = new IntersectionObserver(
         ([entry]) => {
            if (!entry || isTerminated) return;
            isIntersecting.value = entry.isIntersecting;

            if (entry.isIntersecting)
               executeWhileVisible ? checkAndFill() : runCallback();
         },
         { root: null, rootMargin: `${buffer}px 0px`, threshold: 0 },
      );

      if (sentinel.value) observer.observe(sentinel.value);
   });

   watch(sentinel, (newEl, oldEl) => {
      if (!observer || isTerminated) return;
      if (oldEl) observer.unobserve(oldEl);
      if (newEl) observer.observe(newEl);
   });

   onUnmounted(disconnect);

   return {
      isAtBottom: isIntersecting,
      disconnect,
   };
}
