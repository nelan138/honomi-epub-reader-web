<script setup lang="ts">
import { useScroll } from '@vueuse/core';

/* *** */

const emit = defineEmits<{
   toggleTheme: [];
   return: [];
}>();

const { y, directions } = useScroll(window);
const isHeaderVisible = ref(true);

watch([() => directions.top, () => directions.bottom, y], () => {
   if (y.value <= 10) {
      isHeaderVisible.value = true;
   } else if (directions.top) {
      // Scrolling up: reveal and latch open
      isHeaderVisible.value = true;
   } else if (directions.bottom) {
      // Scrolling down: hide
      isHeaderVisible.value = false;
   }
});
</script>

<template>
   <header
      :class="[
         isHeaderVisible ? 'translate-y-0' : '-translate-y-full',
         'hover:border-b-highlight bg-surface border-b-stroke/50 fixed top-0 z-50 mx-auto flex w-full items-center justify-between border-b-2 px-4 py-2 transition-transform duration-300 md:px-16 xl:px-32 2xl:px-64',
      ]"
   >
      <ul class="text-ink/70 flex gap-6">
         <li>
            <button @click="emit('return')" type="button" class="hover:text-highlight hover:cursor-pointer">
               <i class="fa-solid fa-left-long"></i>
            </button>
         </li>
      </ul>
      <ul class="text-ink/70 flex gap-6">
         <li>
            <button @click="emit('toggleTheme')" type="button" class="hover:text-highlight hover:cursor-pointer">
               <i class="fa-solid fa-circle-half-stroke scale-[110%]"></i>
            </button>
         </li>
      </ul>
   </header>
</template>
