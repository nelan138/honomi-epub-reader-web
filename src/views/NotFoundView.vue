<script setup lang="ts">
import { navigateToHomePage } from '@src/utilities';

</script>
<template>
   <div class="bg-bg text-ink flex min-h-dvh flex-col font-serif">
      <header
         class="hover:border-b-highlight bg-surface border-b-stroke/50 sticky top-0 z-100 mx-auto flex w-full items-center justify-between border-b-2 px-4 py-2 transition-colors md:px-16 xl:px-32 2xl:px-64"
      >
         <button
            @click="navigateToHomePage"
            type="button"
            class="hover:text-highlight transition-colors hover:cursor-pointer"
         >
            <i class="fa-solid fa-left-long"></i>
         </button>
      </header>

      <main class="flex flex-1 items-center justify-center p-4">
         <h1 class="text-ink/60 text-sm tracking-[0.3em] uppercase md:text-base">
            404 <span class="border-stroke/50 mx-3 h-full border-l"></span> Not Found
         </h1>
      </main>
   </div>
</template>
