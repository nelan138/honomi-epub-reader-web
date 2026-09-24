<script setup lang="ts">
import { useScroll } from '@vueuse/core';

/* *** */

const emit = defineEmits<{
   toggleTheme: [];
   toggleToc: [];
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
         'fixed top-0 z-100 mx-auto flex w-full items-center justify-between border-b-2 border-(--reader-header-border) bg-(--reader-header-bg) px-4 py-2 transition-transform duration-300 md:px-16 xl:px-32 2xl:px-64',
      ]"
   >
      <ul class="flex gap-6">
         <li>
            <button @click="emit('return')" type="button" class="hover:cursor-pointer">
               <i class="fa-solid fa-left-long"></i>
            </button>
         </li>

         <li>
            <button @click="emit('toggleToc')" type="button" class="hover:cursor-pointer">
               <i class="fa-solid fa-list"></i>
            </button>
         </li>
      </ul>

      <ul class="flex gap-6">
         <li>
            <button @click="emit('toggleTheme')" type="button" class="hover:cursor-pointer">
               <i class="fa-solid fa-circle-half-stroke scale-[110%]"></i>
            </button>
         </li>
      </ul>
   </header>
</template>

<style scoped>
:global(html) {
   --reader-header-bg: #f6f2e6;
   --reader-header-border: #ded6c5;
}

:global(html.dark) {
   --reader-header-bg: #15181a;
   --reader-header-border: #2e353c;
}
</style>
