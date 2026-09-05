<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import useTheme from '@src/composables/library/useTheme';

const route = useRoute();
const router = useRouter();
const { toggleTheme } = useTheme();

const backToHomePage = () => {
   try {
      router.push('/');
   } catch (error) {
      alert('Error navigating to home page: ' + error);
   }
};
</script>

<template>
   <header
      class="hover:border-b-highlight bg-surface border-b-stroke/50 sticky top-0 z-100 mx-auto flex w-full items-center justify-between border-b-2 px-4 py-2 md:px-16 xl:px-32 2xl:px-64"
   >
      <ul class="text-ink/70 flex gap-6">
         <li>
            <button
               @click="backToHomePage"
               type="button"
               class="hover:text-highlight transition-colors hover:cursor-pointer"
            >
               <i class="fa-solid fa-left-long"></i>
            </button>
         </li>
      </ul>
      <ul class="text-ink/70 flex gap-6">
         <li>
            <button
               @click="toggleTheme"
               type="button"
               class="hover:text-highlight transition-colors hover:cursor-pointer"
            >
               <i class="fa-solid fa-circle-half-stroke scale-[110%]"></i>
            </button>
         </li>
      </ul>
   </header>
</template>
