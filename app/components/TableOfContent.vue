<template>
   <USlideover side="left" :close="true" :overlay="false">
      <UButton color="neutral" variant="ghost" icon="lucide:list" />

      <template #content>
         <ul class="flex flex-col h-full w-full text-lg text-default">
            <li v-for="item in readerStore.navigation" :key="item.href">
               <a :href="item.href" class="flex items-center px-4 py-3 hover:underline">
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
</script>

<style scoped></style>
