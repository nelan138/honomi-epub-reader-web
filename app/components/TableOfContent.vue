<template>
   <USlideover v-model:open="slideIsOpen" side="left" :close="true" :ui="{ overlay: 'fixed inset-0 bg-transparent' }">
      <UButton color="neutral" variant="ghost" icon="lucide:list" />

      <template #header>
         <h2>Table of Contents</h2>

         <UButton
            icon="lucide:x"
            color="neutral"
            variant="link"
            class="absolute right-2 top-2"
            @click="slideIsOpen = false"
         />
      </template>

      <template #body>
         <ul class="flex flex-col h-full w-full text-lg text-default">
            <li v-for="item in readerStore.navigation" :key="item.href">
               <a :href="item.href" class="flex items-center px-4 py-3 hover:underline" @click="slideIsOpen = false">
                  {{ item.label }}
               </a>
            </li>
         </ul>
      </template>
   </USlideover>
</template>

<script lang="ts" setup>
const readerStore = useReaderStore();

/* *** */

const slideIsOpen = ref(false);
</script>

<style scoped></style>
